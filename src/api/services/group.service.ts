import { Service } from 'typedi';
import { Repository, getRepository } from 'typeorm';
import { Group } from '../models/group.model';
import { User } from '../models/user.model';
import { GroupMember } from '../models/group-member.model';
import { CreateGroupDTO } from "../dto/createGroup.dto";
import { parsePhone } from "./utils.service";
import { SmsService } from "./sms.service";
import { UsersService } from "./users.service";
import { PushService } from "./push.service";
import { InternalTransaction } from "../models/internal-transaction.model";
import { CreateGreetingDTO, SendGiftDTO, SendGroupGiftDTO, WithdrawMoneyDTO } from "../dto/sendGiftDTO";
import { Greeting } from "../models/greeting.model";
import { CreditCard } from "../models/credit-card.model";
import { Transaction } from "../models/transaction.model";
import { EMoneyRequestedStatus, ETransactionType } from "../models/enums";
import { PaymentService } from "./payment.service";
import { EventService } from "./event.service";
import { EmailService } from "./email.service";
import { CardcomService } from "./cardcom.service";
import { HashidsService } from "./hashids.service";
import { BankAccountService } from "./bank-account.service";
import { MessagingService } from "./messaging.service";
import { EWithdrawType } from "../models/bank-account.model";
import getConfig from "../../config/env.config";

const config = getConfig();

@Service()
export class GroupService {
    private repo: Repository<Group>;
    private groupMemberRepo: Repository<GroupMember>;

    constructor(
        private userService: UsersService,
        private pushService: PushService,
        private emailService: EmailService,
        private paymentService: PaymentService,
        private cardcomService: CardcomService,
        private readonly smsService: SmsService,
        private readonly hashidsService: HashidsService,
        private bankAccountService: BankAccountService,
        private readonly messagingService: MessagingService
    ) { }

    private getRepository() {
        if (!this.repo) {
            this.repo = getRepository(Group);
        }
        return this.repo;
    }

    private getGroupMemberRepository() {
        if (!this.groupMemberRepo) {
            this.groupMemberRepo = getRepository(GroupMember);
        }
        return this.groupMemberRepo;
    }

    async getGroupById(groupId: number, user: User) {
        const group = await this.getRepository().findOne({
            where: { id: groupId },
            relations: ['members', 'groupMembers', 'groupMembers.user',
                'targetUser', 'adminUser', 'greetings', 'greetings.senderUser'],
        });

        if (!group) {
            return null;
        }

        return this.transformGroupForClient(group, user);
    }

    /**
     * Gets encoded hash for group ID
     * @param groupId - numeric group ID
     * @returns encoded hash like "G73387"
     */
    getGroupHash(groupId: number): string {
        return this.hashidsService.encodeGroupId(groupId);
    }

    /**
     * Gets group by encoded hash (public method, no authentication required)
     * @param groupHash - encoded group ID like "G73387"
     * @returns group data or null if not found
     */
    async getGroupByHash(groupHash: string) {
        const groupId = this.hashidsService.decodeGroupId(groupHash);
        
        if (!groupId) {
            return null;
        }

        const group = await this.getRepository().findOne({
            where: { id: groupId },
            relations: ['members', 'groupMembers', 'groupMembers.user',
                'targetUser', 'adminUser', 'greetings', 'greetings.senderUser'],
        });

        if (!group) {
            return null;
        }

        // Return basic group information without user transformation
        // since this is a public endpoint
        return {
            id: group.id,
            name: group.name,
            comment: group.comment,
            dueDate: group.dueDate,
            isOpened: group.isOpened,
            moneyRequestedStatus: group.moneyRequestedStatus,
            adminUser: {
                id: (group.adminUser as User).id,
                fullName: (group.adminUser as User).fullName,
                phone: (group.adminUser as User).phone,
                email: (group.adminUser as User).email,
                profileImage: (group.adminUser as User).profileImage,
            },
            targetUser: {
                id: (group.targetUser as User).id,
                fullName: (group.targetUser as User).fullName,
                phone: (group.targetUser as User).phone,
                email: (group.targetUser as User).email,
                profileImage: (group.targetUser as User).profileImage,
            },
            members: group.groupMembers?.map(gm => ({
                id: gm.user.id,
                fullName: gm.user.fullName,
                phone: gm.user.phone,
                email: gm.user.email,
                profileImage: gm.user.profileImage,
                gender: gm.user.gender,
                accepted: gm.accepted
            })) || group.members?.map(member => ({
                id: member.id,
                fullName: member.fullName,
                phone: member.phone,
                email: member.email,
                profileImage: member.profileImage,
                gender: member.gender,
                accepted: true
            })) || [],
            greetingsCount: group.greetings?.length || 0,
            _createdAt: group._createdAt,
        };
    }

    async getMyGroups(user: User) {
        const groupsIamAdmin = await this.getRepository().find({
            where: { adminUser: user.id },
            relations: ['members', 'groupMembers', 'groupMembers.user', 'targetUser', 'adminUser', 'greetings'],
        });
        const groupsIamTargetUser = await this.getRepository().find({
            where: { targetUser: user.id },
            relations: ['members', 'groupMembers', 'groupMembers.user', 'adminUser', 'targetUser', 'greetings'],
        });
        const groupsIamMember = await this.getRepository().createQueryBuilder('group')
            .innerJoin('group.groupMembers', 'groupMember', 'groupMember.userId = :userId', { userId: user.id })
            .leftJoinAndSelect('group.groupMembers', 'allGroupMembers')
            .leftJoinAndSelect('allGroupMembers.user', 'memberUser')
            .leftJoinAndSelect('group.adminUser', 'adminUser')
            .leftJoinAndSelect('group.targetUser', 'targetUser')
            .leftJoinAndSelect('group.greetings', 'greetings')
            .getMany();

        // merge all of them without duplicates
        const allGroups = [...groupsIamAdmin, ...groupsIamTargetUser, ...groupsIamMember];
        const groupsMap = new Map<number, Group>();
        allGroups.forEach((group) => groupsMap.set(group.id, group));

        const uniqueGroups = Array.from(groupsMap.values());
        return uniqueGroups.map(group => this.transformGroupForClient(group, user));
    }

    /**
     * Notifies newly invited members over every channel (push, WhatsApp, SMS) and records an
     * in-app notification so the invitation also shows up in the notifications list.
     * The push data payload is what lets the app open the group screen when the user taps it.
     */
    private async sendGroupInvitations(group: Group, adminUser: User, members: User[]) {
        const deepLink = `https://yassuapp.com/${this.hashidsService.encodeGroupId(group.id)}`;
        const title = 'הזמנה לקבוצה';
        const message = `היי, ${adminUser.fullName} הזמין אותך לקבוצת ${group.name}. הצטרפו עכשיו באפליקציית יאסו! ${deepLink}`;

        await this.messagingService.notifyMany(members, {
            title,
            body: message,
            text: message,
            type: 'group',
            entityType: 'group',
            entityId: group.id,
            data: {
                groupId: group.id.toString(),
                action: 'group_invite',
                deepLink,
            },
        });
    }

    async createGroup(createGroupDTO: CreateGroupDTO, adminUser: User) {
        // 1) Normalize and parse the receiver's phone number
        const receiverPhoneNumber = parsePhone(createGroupDTO.receiverPhoneNumber);

        // 2) Get or create the target user (the "receiver" of the group)
        const { user: targetUser } = await this.userService.getOrCreateByPhone(
            receiverPhoneNumber,
            {
                fullName: ''
            }
        );

        // 3) For each member phone number, get or create the user
        const members = [];
        for (const memberPhone of createGroupDTO.membersPhoneNumbers) {
            const parsedPhone = parsePhone(memberPhone);
            const { user: memberUser } = await this.userService.getOrCreateByPhone(
                parsedPhone,
                {
                    fullName: ''
                }
            );
            members.push(memberUser);
        }

        // 4) Create and save the Group entity
        const group = this.getRepository().create({
            name: createGroupDTO.name,
            comment: createGroupDTO.comment,
            adminUser: adminUser.id, // or adminUser object if you prefer
            targetUser: targetUser.id,
            members,
            dueDate: createGroupDTO.dueDate
        });

        await group.save();

        // 5) Create GroupMember entries with accepted: false for invited members
        const groupMemberRepo = this.getGroupMemberRepository();
        for (const member of members) {
            const groupMember = groupMemberRepo.create({
                group: group,
                user: member,
                accepted: false // По умолчанию приглашения не приняты
            });
            await groupMember.save();
        }

        await this.sendGroupInvitations(group, adminUser, members);

        return group;
    }

    async withdrawRequest(user: User, groupId: number, dto: WithdrawMoneyDTO) {
        const group = await this.getRepository().findOne({
            where: { id: groupId },
            relations: ['members', 'targetUser', 'adminUser', 'transactions'],
        });
        if (!group) {
            throw new Error('Group not found');
        }

        if (group.targetUserId !== user.id) {
            throw new Error('You are not the admin of this group');
        }

        // 3) Mark the group as "opened" and request the money
        group.isOpened = true;

        if (group.moneyRequestedStatus !== EMoneyRequestedStatus.INITIAL) {
            throw new Error('Money already requested');
        }

        const amount = group.greetings.reduce((acc, greeting) => acc + greeting.amountOfMoney, 0);

        // Get bank account data - either from saved account or from DTO
        let bankData: {
            withdrawType: string;
            bitPhoneNumber?: string;
            bank?: string;
            branch?: string;
            accountNumber?: string;
            accountHolderName?: string;
            accountNationalId?: string;
        };

        if (dto.bankAccountId) {
            // Use existing saved bank account
            const bankAccount = await this.bankAccountService.getById(dto.bankAccountId, user.id);
            if (!bankAccount) {
                throw new Error('Bank account not found');
            }
            bankData = {
                withdrawType: bankAccount.withdrawType,
                bitPhoneNumber: bankAccount.bitPhoneNumber,
                bank: bankAccount.bank,
                branch: bankAccount.branch,
                accountNumber: bankAccount.accountNumber,
                accountHolderName: bankAccount.accountHolderName,
                accountNationalId: bankAccount.accountNationalId
            };
        } else {
            // Use new bank account data from DTO
            if (!dto.withdrawType) {
                throw new Error('Either bankAccountId or withdrawType must be provided');
            }
            bankData = {
                withdrawType: dto.withdrawType,
                bitPhoneNumber: dto.bitPhoneNumber,
                bank: dto.bank,
                branch: dto.branch,
                accountNumber: dto.accountNumber,
                accountHolderName: dto.accountHolderName,
                accountNationalId: dto.accountNationalId
            };

            // Save for future use if requested
            if (dto.saveForFuture) {
                await this.bankAccountService.create(user.id, {
                    withdrawType: dto.withdrawType as EWithdrawType,
                    bitPhoneNumber: dto.bitPhoneNumber,
                    bank: dto.bank,
                    branch: dto.branch,
                    accountNumber: dto.accountNumber,
                    accountHolderName: dto.accountHolderName,
                    accountNationalId: dto.accountNationalId
                });
            }
        }

        // create transaction
        const internalTransaction = InternalTransaction.create({
            receiverUser: user,
            amount,
            fee: config.fee ?? 10,
            transactionDate: new Date(),
            isPaid: false,
            ...bankData
        });

        await internalTransaction.save();

        group.moneyRequestedStatus = EMoneyRequestedStatus.REQUESTED;
        await group.save();

        await this.messagingService.notifyMany(group.members, {
            title: `${user.fullName} קיבל את המתנה!🎉`,
            body: `${user.fullName} מודה לך על המתנה שהעברת לו. תודה רבה!`,
            type: 'group',
            entityType: 'group',
            entityId: group.id,
            data: {
                groupId: group.id.toString(),
                action: 'group_money_requested',
            },
        });

        // Confirm to the recipient that the collected money is on its way
        await this.messagingService.notify(user, {
            title: 'בקשת הכסף נרשמה 💰',
            body: `בקשת איסוף הכסף מקבוצת ${group.name} בסך ${amount} ש"ח נרשמה במערכת ותטופל בהקדם.`,
            type: 'payment',
            entityType: 'group',
            entityId: group.id,
            data: {
                groupId: group.id.toString(),
                action: 'group_money_requested',
            },
        });

        return group;
    }

    async withdrawMoney(groupId: number, adminUser: User) {
        // 1) Find the group, along with relevant relations
        const group = await this.getRepository().findOne({
            where: { id: groupId },
            relations: ['members', 'targetUser', 'adminUser'],
        });
        if (!group) {
            throw new Error('Group not found');
        }

        // 2) Check that the user is indeed the admin of this group
        //    (You can skip this if not needed in your logic.)
        if (group.targetUserId !== adminUser.id) {
            throw new Error('You are not the admin of this group');
        }

        // 3) Mark the group as "opened" and request the money
        group.isOpened = true;

        // 4) Calculate the total from the group's transactions
        //    Adjust if your transaction model has a different field name for amount.
        // const totalGiftSum = group.transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
        const totalGiftSum = 0;

        // 5) Create and save a new InternalTransaction
        const fee = config.fee ?? 10;
        const internalTransaction = await InternalTransaction.create({
            // senderUser: adminUser.id,
            receiverUser: group.targetUserId,
            amount: totalGiftSum,
            fee,
            transactionDate: new Date(),
            // eventDate: new Date(group.dueDate),
            isPaid: false,
        }).save();

        // Persist changes to the group
        await group.save();

        // 6) Notify all members over every channel
        await this.messagingService.notifyMany(group.members, {
            title: `${adminUser.fullName} קיבל את המתנה!🎉`,
            body: `${adminUser.fullName} מודה לך על המתנה שהעברת לו. תודה רבה!`,
            type: 'group',
            entityType: 'group',
            entityId: group.id,
            data: {
                groupId: group.id.toString(),
                action: 'group_money_withdrawn',
            },
        });

        return group;
    }

    async inviteMembersToGroup(groupId: number, adminUser: User, phoneNumbers: string[]) {
        // 1) Find the group
        const group = await this.getRepository().findOne({
            where: { id: groupId },
            relations: ['members', 'groupMembers', 'groupMembers.user', 'adminUser'] // load existing members & adminUser
        });
        if (!group) {
            throw new Error('קבוצה לא נמצאה');
        }

        // Check if group is already opened (converted to event)
        if (group.isOpened) {
            throw new Error('לא ניתן להזמין חברים לקבוצה שכבר נפתחה');
        }

        const newlyAddedMembers: User[] = [];
        const duplicatePhones: string[] = [];

        // 2) Resolve every phone number first and validate the whole batch BEFORE writing anything,
        //    so a request that ends up rejected doesn't leave half the members invited.
        for (const phone of phoneNumbers) {
            const parsedPhone = parsePhone(phone);
            const { user: memberUser } = await this.userService.getOrCreateByPhone(parsedPhone, {});

            // 3) Check if user is already invited via GroupMember or is in the old members array
            const existingGroupMember = group.groupMembers?.find((gm) => gm.user.id === memberUser.id);
            const alreadyMember = group.members.find((m) => m.id === memberUser.id);
            const isAdmin = (group.adminUser as User).id === memberUser.id;
            const alreadyInBatch = newlyAddedMembers.some((m) => m.id === memberUser.id);

            if (existingGroupMember || alreadyMember || isAdmin || alreadyInBatch) {
                duplicatePhones.push(parsedPhone);
            } else {
                newlyAddedMembers.push(memberUser);
            }
        }

        // If there are duplicate invitations, throw before any write or notification happens
        if (duplicatePhones.length > 0) {
            const duplicateList = duplicatePhones.join(', ');
            if (duplicatePhones.length === 1) {
                throw new Error(`מספר הטלפון ${duplicateList} כבר חבר בקבוצה או מוזמן אליה`);
            } else {
                throw new Error(`מספרי הטלפון הבאים כבר חברים בקבוצה או מוזמנים אליה: ${duplicateList}`);
            }
        }

        // If no new members were added, return early
        if (newlyAddedMembers.length === 0) {
            return this.getGroupById(groupId, adminUser);
        }

        // 4) Persist the new GroupMember rows.
        //
        //    Do NOT call group.save() here. Group.groupMembers is @OneToMany with cascade: true, so
        //    saving the group with the relation loaded makes TypeORM diff the in-memory array
        //    (which does not contain these brand new rows) against the database and unbind
        //    whatever is missing — setting group_member.groupId to NULL. That silently dropped
        //    every member added to an existing group: the invite notification went out but the
        //    member never showed up in the group or in their own invitations list.
        //    The members many-to-many is updated through a targeted relation query instead.
        //    Referencing the group by id (rather than the loaded entity) keeps TypeORM from
        //    traversing back into that stale groupMembers array at all.
        const groupMemberRepo = this.getGroupMemberRepository();
        await groupMemberRepo.save(
            newlyAddedMembers.map((memberUser) => groupMemberRepo.create({
                group: { id: group.id } as Group,
                user: { id: memberUser.id } as User,
                accepted: false
            }))
        );

        // Keep the legacy members many-to-many in sync without touching the groupMembers relation
        await this.getRepository()
            .createQueryBuilder()
            .relation(Group, 'members')
            .of(group.id)
            .add(newlyAddedMembers.map((memberUser) => memberUser.id));

        // 5) Notify the newly added members over every channel
        await this.sendGroupInvitations(group, group.adminUser as User, newlyAddedMembers);

        // 6) Return the group in the same shape the client gets from GET /group/:id, so the
        //    members list can be refreshed straight from this response
        return this.getGroupById(groupId, adminUser);
    }

    async editGroup(groupId: number, adminUser: User, newName: string, newDate: Date, newComment?: string) {
        // 1) Find the group, including adminUser relation so we can confirm ownership
        const group = await this.getRepository().findOne({
            where: { id: groupId },
            relations: ['adminUser'],
        });

        if (!group) {
            throw new Error('Group not found');
        }

        // Check if group is already opened (converted to event)
        if (group.isOpened) {
            throw new Error('Cannot edit an already opened group');
        }

        // 2) Ensure the requesting user is the admin
        //    (You could compare group.adminUserId !== adminUser.id if you store just the IDs)
        if ((group.adminUser as User).id !== adminUser.id) {
            throw new Error('You are not the admin of this group');
        }

        // 3) Update the allowed fields
        group.name = newName;
        group.dueDate = newDate;
        if (newComment !== undefined) {
            group.comment = newComment;
        }

        // 4) Save changes
        await group.save();

        // 5) Return the updated group
        return group;
    }

    async deleteGroup(groupId: number, user: User) {

        // 1) Fetch the group with its adminUser relation
        const group = await this.getRepository().findOne({
            where: { groupId },
            relations: ['adminUser']
        });
        if (!group) {
            throw new Error('Group not found');
        }

        // 2) Check if the current user is the admin
        //    Compare IDs (group.adminUser might be an object or just an id)
        if ((group.adminUser as User).id !== user.id) {
            throw new Error('You are not the admin of this group');
        }

        // 3) Check if the group is still closed (isOpened === false)
        if (group.isOpened) {
            throw new Error('Cannot delete an already opened group');
        }

        // 4) Delete the group
        await this.getRepository().remove(group);

        // Optionally, return some success result or a message
        return { success: true, message: 'Group deleted successfully' };
    }

    async sendGreeting(transformed: SendGroupGiftDTO, user: User) {
        const group = await Group.findOne({
            where: { id: transformed.groupID },
            relations: ['greetings', 'targetUser', 'adminUser', 'members'],
        });
        if (!group) {
            throw new Error('Group not found');
        }

        // Check if group is already opened (converted to event)
        if (group.isOpened) {
            throw new Error('Cannot send greeting to an already opened group');
        }

        const greeting = Greeting.create({
            senderUser: user.id,
            receiverUser: group.targetUser, // or group.targetUserId
            group,                          // or group: group.id
            imageURL: transformed.imageURL || '',
            videoURL: transformed.videoURL || '',
            greetingText: transformed.greetingText || '',
            amountOfMoney:
                transformed.totalGiftSum && transformed.totalGiftSum > 0
                    ? transformed.totalGiftSum
                    : 0,
        });

        if (transformed.totalGiftSum && transformed.totalGiftSum > 0 && transformed.cardID) {
            const card = await CreditCard.findOne({
                where: { id: transformed.cardID, user: user.id },
            });
            if (card) {
                const fee = config.fee ?? 10;
                const isDev = config.cardCom?.isDev || false;

                if (isDev) {
                    console.log('[DEV MODE] Skipping payment validation, simulating success...');
                } else {
                    try {
                        const transacationData = await this.cardcomService.chargePayment((transformed.totalGiftSum + fee), card.token, card.cardExpirationMMYY, null);
                    } catch (e) {
                        console.error(e);
                    }
                }
                await this.notifyAdminsOnTransaction(user, transformed, fee);
            }
        }

        await greeting.save();
        group.greetings.push(greeting);
        // 4) Save the group (to persist the new greeting/transaction references)
        await group.save();

        // 5) Notify only the group admin (not all members)
        const adminUser = group.adminUser as User;

        // Title and body in Hebrew
        const title = 'ברכה חדשה בקבוצה!';
        const body = `${user.fullName || 'משתמש'} שלח/ה ברכה חדשה בקבוצה "${group.name}".`;

        if (adminUser && adminUser.id !== user.id) {
            await this.messagingService.notify(adminUser, {
                title,
                body,
                type: 'group',
                entityType: 'group',
                entityId: group.id,
                data: {
                    groupId: group.id.toString(),
                    action: 'group_greeting',
                },
            });
        }

        // 6) Return the newly created greeting
        return greeting;

    }

    private async notifyAdminsOnTransaction(senderUser: User, dto: SendGroupGiftDTO, fee: number) {

        const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>עדכון | נשלחה מתנה בקבוצה</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    direction: rtl;
                    text-align: right;
                    background-color: #f9f9f9;
                    color: #333;
                    padding: 20px;
                    margin: 0;
                }
                .container {
                    background-color: #ffffff;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    direction: rtl;
                }
                .header {
                    background-color: #4CAF50;
                    padding: 15px;
                    border-radius: 8px 8px 0 0;
                    text-align: center;
                    color: #fff;
                    font-size: 24px;
                    direction: rtl;
                }
                .details {
                    padding: 15px;
                    background: #f9f9f9;
                    text-align: right;
                }
                .details p {
                    padding: 5px;
                    font-size: 18px;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    color: #666;
                    font-size: 14px;
                    background: #f9f9f9;
                }
                .highlight {
                    color: #e91e63;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    עדכון: נשלחה מתנה חדשה מאפליקציית יאסו 🎁
                </div>
                <div class="details">
                    <p><strong>שולח:</strong> <span class="highlight">${senderUser.fullName}</span></p>
                    <p><strong>תאריך העסקה:</strong> <span class="highlight">${new Date().toLocaleDateString('he-IL')}</span></p>
                    <p><strong>סכום המתנה:</strong> <span class="highlight">${dto.totalGiftSum} ש"ח</span></p>
                    <p><strong>עמלה:</strong> <span class="highlight">${fee} ש"ח</span></p>
                </div>
                <div class="footer">
                המערכת תשלח אוטומטית מייל נוסף ביום האירוע עם פרטי העברה המתבקשת.
                </div>
            </div>
        </body>
        </html>
        `;
        const subject = 'עדכון | נשלחה מתנה חדשה';
        const receivers = 'tal@any-app.com';
        await this.emailService.send(receivers, subject, htmlTemplate);
    }

    async acceptGroupInvitation(groupId: number, userId: number) {
        const groupMember = await this.getGroupMemberRepository()
            .createQueryBuilder('groupMember')
            .leftJoinAndSelect('groupMember.group', 'group')
            .leftJoinAndSelect('groupMember.user', 'user')
            .where('groupMember.group.id = :groupId', { groupId })
            .andWhere('groupMember.user.id = :userId', { userId })
            .getOne();

        if (!groupMember) {
            throw new Error('Group invitation not found');
        }

        // Check if group is already opened (converted to event)
        if (groupMember.group.isOpened) {
            throw new Error('Cannot accept invitation to an already opened group');
        }

        groupMember.accepted = true;
        await groupMember.save();

        // Let the group admin know someone joined
        const group = await this.getRepository().findOne({
            where: { id: groupId },
            relations: ['adminUser'],
        });
        const adminUser = group?.adminUser as User;
        if (adminUser && adminUser.id !== userId) {
            const memberName = groupMember.user?.fullName || 'משתמש';
            await this.messagingService.notify(adminUser, {
                title: 'הצטרפות חדשה לקבוצה',
                body: `${memberName} הצטרף לקבוצת ${group.name}.`,
                type: 'group',
                entityType: 'group',
                entityId: groupId,
                data: {
                    groupId: groupId.toString(),
                    action: 'group_member_joined',
                },
            });
        }

        return groupMember;
    }

    async rejectGroupInvitation(groupId: number, userId: number) {
        const groupMember = await this.getGroupMemberRepository()
            .createQueryBuilder('groupMember')
            .leftJoinAndSelect('groupMember.group', 'group')
            .leftJoinAndSelect('groupMember.user', 'user')
            .where('groupMember.group.id = :groupId', { groupId })
            .andWhere('groupMember.user.id = :userId', { userId })
            .getOne();

        if (!groupMember) {
            throw new Error('Group invitation not found');
        }

        // Check if group is already opened (converted to event)
        if (groupMember.group.isOpened) {
            throw new Error('Cannot reject invitation to an already opened group');
        }

        await this.getGroupMemberRepository().remove(groupMember);

        const group = await this.getRepository().findOne({
            where: { id: groupId },
            relations: ['members']
        });

        if (group) {
            group.members = group.members.filter(member => member.id !== userId);
            await group.save();
        }

        return { success: true, message: 'Group invitation rejected and removed' };
    }

    async getUserGroupInvitations(userId: number) {
        const groupMembers = await this.getGroupMemberRepository()
            .createQueryBuilder('groupMember')
            .innerJoinAndSelect('groupMember.group', 'group')
            .leftJoinAndSelect('group.adminUser', 'adminUser')
            .leftJoinAndSelect('group.targetUser', 'targetUser')
            .leftJoinAndSelect('group.groupMembers', 'allGroupMembers')
            .leftJoinAndSelect('allGroupMembers.user', 'memberUser')
            .leftJoinAndSelect('group.members', 'members')
            .where('groupMember.user.id = :userId', { userId })
            .andWhere('groupMember.accepted = :accepted', { accepted: false })
            .andWhere('group._deletedAt IS NULL') // Exclude soft-deleted groups
            .getMany();

        // Get user object for transformation
        const user = await this.userService.findOne(userId);
        if (!user) {
            return [];
        }

        // Filter out any null groups (safety check) and transform groups
        return groupMembers
            .map(gm => gm.group)
            .filter(group => group !== null && group !== undefined)
            .map(group => this.transformGroupForClient(group, user));
    }

    // Transforming the group for the client with information about invitation acceptance status
    private transformGroupForClient(group: Group, user: User) {
        const membersWithStatus = group.groupMembers?.map(gm => ({
            id: gm.user.id,
            fullName: gm.user.fullName,
            phone: gm.user.phone,
            email: gm.user.email,
            profileImage: gm.user.profileImage,
            gender: gm.user.gender,
            accepted: gm.accepted
        })) || [];

        const finalMembers = membersWithStatus.length > 0 ? membersWithStatus :
            group.members?.map(member => ({
                id: member.id,
                fullName: member.fullName,
                phone: member.phone,
                email: member.email,
                profileImage: member.profileImage,
                gender: member.gender,
                accepted: true
            })) || [];
        return {
            ...group,
            accepted: group.groupMembers?.some(gm => gm.user.id === user.id && gm.accepted) ||
                (group.targetUser as User)?.id === user.id ||
                (group.adminUser as User)?.id === user.id,
            members: finalMembers
        };
    }

    async deleteAllGroupsForTesting() {
        try {
            // 1. Удаляем все записи GroupMember
            await this.getGroupMemberRepository().delete({});

            // 2. Удаляем все Greetings связанные с группами
            const greetingRepo = getRepository(Greeting);
            await greetingRepo.delete({ group: {} as any });

            // 3. Удаляем все группы
            await this.getRepository().delete({});

            return {
                success: true,
                message: 'All groups, group members and group greetings deleted successfully',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error deleting all groups:', error);
            throw new Error('Failed to delete all groups: ' + error.message);
        }
    }

}
