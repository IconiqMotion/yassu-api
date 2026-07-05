import { Service } from 'typedi'
import { PaymentService } from "./payment.service";
import { User } from "../models/user.model";
import { getRepository, IsNull, LessThanOrEqual, Not, Repository } from "typeorm";
import { Event } from "../models/event.model";
import { AuthService } from "./auth.service";
import { SmsService } from "./sms.service";
import { EmailService } from "./email.service";
import { PushService } from "./push.service";
import { Greeting } from "../models/greeting.model";
import { Group } from "../models/group.model";
import { GroupService } from "./group.service";
import { SendGiftDTO, WithdrawMoneyDTO } from "../dto/sendGiftDTO";
import { parsePhone } from "./utils.service";
import { CreditCard } from "../models/credit-card.model";
import { Transaction } from "../models/transaction.model";
import { EMoneyRequestedStatus, ETransactionType } from "../models/enums";
import { UsersService } from "./users.service";
import { InternalTransaction } from "../models/internal-transaction.model";
import { CardcomService } from "./cardcom.service";
import { NotificationService } from "./notification.service";
import { HashidsService } from "./hashids.service";
import { BankAccountService } from "./bank-account.service";
import { EWithdrawType } from "../models/bank-account.model";
import getConfig from "../../config/env.config";

const config = getConfig();

@Service()
export class EventService {
    private repo: Repository<Event>;

    constructor(private paymentService: PaymentService,
        private smsService: SmsService,
        private pushService: PushService,
        private groupService: GroupService,
        private cardcomService: CardcomService,
        private emailService: EmailService,
        private userService: UsersService,
        private notificationService: NotificationService,
        private authService: AuthService,
        private readonly hashidsService: HashidsService,
        private bankAccountService: BankAccountService) {
    }

    findOne(id: number) {
        return this.getRepository().findOne(id, { relations: ['greetings', 'receiverUser'] });
    }

    findOneWithGreetingAndUsers(id: number) {
        return this.getRepository().findOne(id, { relations: ['greetings', 'greetings.senderUser', 'greetings.receiverUser'] });
    }

    /**
     * Gets event by ID and verifies user has access to it
     * User has access if they are the receiver or a sender of any greeting
     * @param eventId - numeric event ID
     * @param user - user to check access for
     * @returns event data or null if not found or no access
     */
    async getEventById(eventId: number, user: User) {
        const event = await this.getRepository().findOne(eventId, {
            relations: ['greetings', 'greetings.senderUser', 'receiverUser']
        });

        if (!event) {
            return null;
        }

        // Check if user is the receiver
        if (event.receiverUserId === user.id) {
            return event;
        }

        // Check if user is a sender of any greeting
        const isSender = event.greetings?.some(greeting => greeting.senderUserId === user.id);
        if (isSender) {
            return event;
        }

        return null;
    }

    /**
     * Gets encoded hash for event ID
     * @param eventId - numeric event ID
     * @returns encoded hash like "E73387"
     */
    getEventHash(eventId: number): string {
        return this.hashidsService.encodeEventId(eventId);
    }

    /**
     * Gets event by encoded hash (public method, no authentication required)
     * @param eventHash - encoded event ID like "E73387"
     * @returns event data or null if not found
     */
    async getEventByHash(eventHash: string) {
        const eventId = this.hashidsService.decodeEventId(eventHash);

        if (!eventId) {
            return null;
        }

        const event = await this.getRepository().findOne({
            where: { id: eventId },
            relations: ['receiverUser', 'greetings', 'greetings.senderUser'],
        });

        if (!event) {
            return null;
        }

        // Return basic event information without user transformation
        // since this is a public endpoint
        return {
            id: event.id,
            name: event.name,
            day: event.day,
            month: event.month,
            year: event.year,
            finishedProcessing: event.finishedProcessing,
            image: event.image,
            moneyRequestedStatus: event.moneyRequestedStatus,
            receiverUser: event.receiverUser ? {
                id: (event.receiverUser as User).id,
                fullName: (event.receiverUser as User).fullName,
                phone: (event.receiverUser as User).phone,
                email: (event.receiverUser as User).email,
                profileImage: (event.receiverUser as User).profileImage,
            } : null,
            greetingsCount: event.greetings?.length || 0,
            _createdAt: event._createdAt,
        };
    }

    async withdrawRequest(user: User, eventId: number, dto: WithdrawMoneyDTO) {
        const isDev = !config.production;
        const event = await this.findOne(eventId);

        // DEV MODE: Allow testing bank account saving without real event
        if (!event && isDev) {
            // In dev mode, just save bank account if requested and return success
            if (dto.saveForFuture && dto.withdrawType) {
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
            // Return mock success for dev testing
            return { id: eventId, moneyRequestedStatus: EMoneyRequestedStatus.REQUESTED } as any;
        }

        if (!event) {
            throw new Error('Event not found');
        }
        // check that event user is the user
        if (event.receiverUserId != user.id) {
            throw new Error('You are not the receiver of this event');
        }

        if (event.moneyRequestedStatus !== EMoneyRequestedStatus.INITIAL) {
            throw new Error('Money already requested');
        }

        const amount = event.greetings.reduce((acc, greeting) => acc + greeting.amountOfMoney, 0);

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

        event.internalTransaction = internalTransaction;
        event.moneyRequestedStatus = EMoneyRequestedStatus.REQUESTED;
        await event.save();
        return event;
    }

    getRepository() {
        if (!this.repo) {
            this.repo = getRepository(Event)
        }
        return this.repo;
    }

    getMyEvents(user: User) {
        return this.getRepository().find({ where: { receiverUser: user.id, finishedProcessing: true }, relations: ['greetings', 'greetings.senderUser'] });
    }

    async myReceivedGreetings(user: User) {
        const myEvents = await this.getMyEvents(user);
        const greetings = [];
        for (const event of myEvents) {
            greetings.push(...event.greetings);
        }
        return greetings;
    }

    mySentGreetings(user: User) {
        return Greeting.find({
            where: { senderUser: user.id },
            relations: ['event', 'receiverUser']
        });
    }

    /**
     * Returns a Set of user IDs who are connected to `currentUser`
     * via greetings (events) or via shared groups.
     */
    private async getConnectedUserIds(currentUser: User): Promise<Set<number>> {
        // 1) Gather all greetings in which currentUser is sender or receiver
        const greetings = await Greeting
            .createQueryBuilder('g')
            .where('g.senderUserId = :currId OR g.receiverUserId = :currId', {
                currId: currentUser.id
            })
            .getMany();

        const connectedViaGreetings = new Set<number>();
        for (const g of greetings) {
            if (g.senderUserId && g.senderUserId !== currentUser.id) {
                connectedViaGreetings.add(g.senderUserId);
            }
            if (g.receiverUserId && g.receiverUserId !== currentUser.id) {
                connectedViaGreetings.add(g.receiverUserId);
            }
        }

        // 2) Gather all groups that contain currentUser (as admin, target, or member)
        const groups = await Group
            .createQueryBuilder('grp')
            .leftJoinAndSelect('grp.members', 'm')
            .where('grp.adminUserId = :currId OR grp.targetUserId = :currId OR m.id = :currId', {
                currId: currentUser.id
            })
            .getMany();

        const connectedViaGroups = new Set<number>();
        for (const g of groups) {
            if (g.adminUserId) {
                connectedViaGroups.add(g.adminUserId);
            }
            if (g.targetUserId) {
                connectedViaGroups.add(g.targetUserId);
            }
            for (const member of g.members) {
                connectedViaGroups.add(member.id);
            }
        }

        // Combine into a single set, excluding currentUser
        const allConnectedUserIds = new Set<number>([
            ...connectedViaGreetings,
            ...connectedViaGroups
        ]);
        allConnectedUserIds.delete(currentUser.id);

        return allConnectedUserIds;
    }

    /**
     * Returns users whose birthday falls within the next month (from today),
     * and who are in the connectedUserIds set.
     * 
     * Example: If today is January 20, returns users with birthdays from Jan 20 to Feb 20.
     */
    private async getBirthdayUsersInNextMonth(
        connectedUserIds: Set<number>
    ): Promise<User[]> {
        // Get all users with birthDate
        const usersWithBirthday = await User
            .createQueryBuilder('user')
            .andWhere('user.birthDate IS NOT NULL')
            .andWhere('user.firstName IS NOT NULL AND user.firstName != \'\'')
            .andWhere('user.isActive = :active', { active: true })
            .getMany();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const oneMonthFromToday = new Date(today);
        oneMonthFromToday.setMonth(today.getMonth() + 1);
        
        const currentYear = today.getFullYear();

        return usersWithBirthday.filter(user => {
            if (!connectedUserIds.has(user.id)) return false;
            if (!user.birthDate) return false;

            const birthDate = new Date(user.birthDate);
            if (isNaN(birthDate.getTime())) return false;

            // Create birthday date for current year
            let birthdayThisYear = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
            
            // If birthday this year has passed, check next year's birthday
            const birthdayToCheck = birthdayThisYear < today 
                ? new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate())
                : birthdayThisYear;

            // Check if birthday is within the next month from today
            return birthdayToCheck >= today && birthdayToCheck <= oneMonthFromToday;
        });
    }

    /**
     * Main method that returns data for the homepage,
     * including a list of users celebrating birthdays
     * in the next calendar month (from today) who are connected to currentUser.
     */
    public async getHomePageData(currentUser: User) {
        // 1) Kick off everything that doesn't depend on each other at the same time
        const connectedUserIdsPromise = this.getConnectedUserIds(currentUser);

        const myEventsPromise = this.getMyEvents(currentUser);
        const myGroupsPromise = this.groupService.getMyGroups(currentUser);
        const myLastGreetingsPromise = this.mySentGreetings(currentUser);

        // 2) Wait for `connectedUserIds` because we need it for the birthday query
        const connectedUserIds = await connectedUserIdsPromise;

        // 3) Get users celebrating in the next month (from today, not calendar month)
        const celebratingThisMonth = await this.getBirthdayUsersInNextMonth(connectedUserIds);

        // 4) Grab all other awaited results in parallel
        const [myEvents, myGroups, myLastGreetings] = await Promise.all([
            myEventsPromise,
            myGroupsPromise,
            myLastGreetingsPromise,
        ]);

        return {
            celebratingThisMonth,
            celebratingNextMonth: [], // Deprecated - now using rolling month window
            myEvents,
            myGroups,
            myLastGreetings
        }
    }

    async getOrCreateByDateAndUser(day: number, month: number, year: number, receiverId: number, receiverPhoneNumber: string) {
        let event = await this.getRepository().findOne({ where: { day, month, year, receiverPhoneNumber } });
        const eventName = `חגיגות ${day}/${month}`;
        if (!event) {
            event = await this.getRepository().create({ day, month, year, receiverPhoneNumber, receiverUser: receiverId, name: eventName }).save();
        }
        return this.findOne(event.id);
    }

    async handleDaily() {
        // find all of the users with an fcmToken
        const users = await User.find({ where: { fcmToken: Not(IsNull()) } });
        // iterate over the users and send them a notification
        for (const user of users) {
            await this.pushService.send(user.fcmToken, user.fullName + '🎁 למי נשלח היום מתנה?', 'מישהו חוגג היום? בואו להפתיע אותו ביאסו!', {});
        }
        return;
    }

    async handleTodaysGroups() {
        const today = new Date();
        const groups = await Group.find({
            where: {
                dueDate: LessThanOrEqual(today),
                isOpened: false
            },
            relations: ['targetUser', 'greetings', 'greetings.senderUser']
        });
        for (const group of groups) {
            await this.handleGroup(group);
        }
    }

    async handleTodaysEvents() {
        const today = new Date();
        const events = await this.getRepository().find({ where: { day: today.getDate(), month: today.getMonth() + 1, year: today.getFullYear() }, relations: ['receiverUser', 'greetings', 'greetings.senderUser'] });
        console.log('events', events);
        for (const event of events) {
            await this.handleEvent(event);
        }
    }

    async handleGroup(group: Group) {
        // Extract date components from group.dueDate
        const dueDate = new Date(group.dueDate);
        const day = dueDate.getDate();
        const month = dueDate.getMonth() + 1; // JavaScript months are 0-based
        const year = dueDate.getFullYear();

        // Create new Event from Group data
        const event = await this.getRepository().create({
            day,
            month,
            year,
            finishedProcessing: true,
            name: group.name,
            receiverPhoneNumber: (group.targetUser as User).phone,
            receiverUser: group.targetUserId,
            moneyRequestedStatus: EMoneyRequestedStatus.INITIAL
        }).save();

        // Transfer greetings from Group to Event and process them
        let totalAmount = 0;
        const unhandledTransactions = group.greetings.filter(greeting => !greeting.finishedProcessing);

        for (const greeting of unhandledTransactions) {
            totalAmount += greeting.amountOfMoney;

            // Update greeting to reference the new event instead of group
            greeting.event = event;
            greeting.group = null; // Remove group reference

            if (greeting.amountOfMoney > 0) {
                // create transfer note
                await this.sendPushToSender(greeting.senderUser as User, group.targetUser as User);
                greeting.finishedProcessing = true;
                await greeting.save();
            } else {
                await greeting.save();
            }
        }

        // Send notifications to receiver if there's money involved
        if (totalAmount > 0) {
            this.sendSmsToReceiver((group.targetUser as User).phone, totalAmount, undefined, event.id);
            await this.sendPushToReceiver(group.targetUser as User, totalAmount);
        }

        // Update group status
        group.isOpened = true;
        await group.save();
    }

    async handleEvent(event: Event) {
        // send sms to the user
        // handle event's transactions
        let totalAmount = 0;
        const unhandledTransactions = event.greetings.filter(greeting => !greeting.finishedProcessing);
        for (const greeting of unhandledTransactions) {
            totalAmount += greeting.amountOfMoney;
            if (greeting.amountOfMoney > 0) {
                // create transfer note
                await this.sendPushToSender(greeting.senderUser as User, event.receiverUser as User);
                greeting.finishedProcessing = true;
                await greeting.save();
            }
        }
        if (totalAmount > 0) {
            // Check if there's only one sender
            const uniqueSenders = new Set(unhandledTransactions.map(g => (g.senderUser as User).id));
            const senderName = uniqueSenders.size === 1 ? (unhandledTransactions[0].senderUser as User).fullName : null;

            this.sendSmsToReceiver(event.receiverPhoneNumber, totalAmount, senderName, event.id);
            await this.sendPushToReceiver(event.receiverUser as User, totalAmount, senderName);
        }
        event.finishedProcessing = true;
        await this.getRepository().save(event);
    }

    async updateAdminsAboutTransaction(totalAmount: number, receiverUser: User, senderUser: User) {
        const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>עדכון | משתמש עדכן פרטי חשבון</title>
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
                    פעולה לביצוע - העברת כספים
                </div>
                <div class="details">
                    <p>שלום צוות יאסו, פרטי העברה חדשה לביצוע</p>
                    <p><strong>שם מקבל ההעברה</strong> <span class="highlight">${receiverUser.fullName}</span></p>
                    <p><strong>סכום ההעברה</strong> <span class="highlight">${totalAmount} ש"ח</span></p>
                    <p><strong>שם השולח</strong> <span class="highlight">${senderUser.fullName}</span></p>
                    <p>נא לבצע את ההעברה בהקדם.</p>
                </div>
            </div>
        </body>
        </html>
        `;
        const subject = 'פעולה לביצוע | העברת כספים אל ' + receiverUser.fullName;
        const receivers = 'tal@any-app.com';
        await this.emailService.send(receivers, subject, htmlTemplate);
    }



    private sendSmsToReceiver(receiverPhoneNumber: string, totalAmount: number, senderName: string | undefined, eventId: number) {
        // Generate event-specific link with E prefix
        const link = `https://yassuapp.com/${this.hashidsService.encodeEventId(eventId)}`;

        const message = senderName
            ? `מזל טוב! קיבלת מתנה חדשה מאת ${senderName} באפליקציית יאסו 🎁\nסכום המתנה: ${totalAmount} ש"ח\nלקבל המתנה, היכנס לאפליקציה:\n${link}`
            : `מזל טוב! קיבלת מתנה חדשה באפליקציית יאסו 🎁\nסכום המתנה: ${totalAmount} ש"ח\nלקבל המתנה, היכנס לאפליקציה:\n${link}`;
        this.smsService.sendSms(receiverPhoneNumber, message);
        this.smsService.sendWhatsappMessage(receiverPhoneNumber, message);
    }

    private async sendPushToReceiver(receiverUser: User, totalAmount: number, senderName?: string) {
        const title = senderName
            ? `${receiverUser.fullName}קיבלת מתנה חדשה מ${senderName} 🎁`
            : `${receiverUser.fullName} קיבלת מתנה חדשה 🎁`;
        const body = 'איזה כיף! היכנסו לאפליקציה כדי לקרוא את הברכות ולקבל את המתנה';
        if (receiverUser.fcmToken) {
            await this.pushService.send(receiverUser.fcmToken, title, body, {});
        }
        // create notification
        const notificationData = {
            title,
            message: body,
            type: 'greeting',
            userId: receiverUser.id,
        }
        await this.notificationService.createNotification(notificationData);
    }

    private async sendPushToSender(senderUser: User, receiverUser: User) {
        const title = `${senderUser.fullName}, המתנה שלך הגיעה ל${receiverUser.fullName} 🎁`;
        const body = `איזה כיף! המתנה ששלחת הגיעה ל${receiverUser.fullName}`;
        if (senderUser.fcmToken) {
            await this.pushService.send(senderUser.fcmToken, title, body, {});
        }
        // create notification
        const notificationData = {
            title,
            message: body,
            type: 'greeting',
            userId: senderUser.id,
        }
        await this.notificationService.createNotification(notificationData);
    }

    async notifyThanks(user: User, eventId: string) {
        const event = await this.getRepository().findOne(eventId, { relations: ['greetings', 'greetings.senderUser'] });
        if (!event) {
            return;
        }
        // iterate over greetings and send sms to each sender
        for (const greeting of event.greetings) {
            this.smsService.sendSms((greeting.senderUser as User).phone, `${user.fullName} קיבל את המתנה ששלחת לו באפליקציית יאסו. תודה רבה!`);
            this.smsService.sendWhatsappMessage((greeting.senderUser as User).phone, `${user.fullName} קיבל את המתנה ששלחת לו באפליקציית יאסו. תודה רבה!`);
            // create notification for sender
            const notificationData = {
                title: `${user.fullName} קיבל את המתנה שלך 🎁`,
                message: `תודה על המתנה ששלחת ל${user.fullName}`,
                type: 'greeting',
                userId: (greeting.senderUser as User).id,
            };
            await this.notificationService.createNotification(notificationData);
        }
        event.notified = true;
        await event.save();

    }

    async create(createGiftDTO: SendGiftDTO, senderUser: User) {
        try {
            createGiftDTO.receiverPhoneNumber = parsePhone(createGiftDTO.receiverPhoneNumber);
            console.log('Parsed phone number:', createGiftDTO.receiverPhoneNumber);

            // create receiver user if not exist
            console.log('Attempting to get or create receiver user...');
            const receiverUser = await this.userService.getOrCreateByPhone(createGiftDTO.receiverPhoneNumber, { fullName: createGiftDTO.receiverName });
            console.log('Receiver user:', JSON.stringify(receiverUser));

            // get or create event
            console.log('Attempting to get or create event...');
            const event = await this.getOrCreateByDateAndUser(createGiftDTO.eventDay, createGiftDTO.eventMonth, createGiftDTO.eventYear, receiverUser.user.id, createGiftDTO.receiverPhoneNumber);
            console.log('Event:', JSON.stringify(event));

            event.finishedProcessing = false;

            // create greeting
            console.log('Creating greeting...');
            const greeting = Greeting.create({
                senderUser,
                receiverUser: receiverUser.user.id,
                imageURL: createGiftDTO.imageURL || '',
                videoURL: createGiftDTO.videoURL || '',
                greetingText: createGiftDTO.greetingText,
                amountOfMoney: createGiftDTO.totalGiftSum > 0 ? createGiftDTO.totalGiftSum : 0,
                event: event.id
            });
            console.log('Created greeting:', JSON.stringify(greeting));

            // create transaction
            if (createGiftDTO.totalGiftSum > 0) {
                console.log('Processing payment...');
                const card = await CreditCard.findOne({ where: { id: createGiftDTO.cardID, user: senderUser.id } });
                console.log('Found card:', JSON.stringify(card));

                if (card) {
                    try {
                        const fee = config.fee ?? 10;
                        const isDev = config.cardCom?.isDev || false;

                        if (isDev) {
                            console.log('[DEV MODE] Skipping payment validation, simulating success...');
                        } else {
                            console.log('Attempting to charge payment...', card);
                            const transacationData = await this.cardcomService.chargePayment((createGiftDTO.totalGiftSum + fee), card.token, card.cardExpirationMMYY, null);
                            console.log('Transaction data:', JSON.stringify(transacationData));

                            const responseCode = transacationData?.ResponseCode;
                            if (Number(responseCode) !== 0) {
                                console.error('Payment failed with response code:', responseCode);
                                throw new Error(transacationData.Description || 'Error while creating payment card');
                            }
                        }

                        try {
                            await this.notifyAdminsOnTransaction(senderUser, receiverUser, createGiftDTO, fee);
                        } catch (notifyError) {
                            console.error('Failed to notify admins on transaction:', notifyError);
                        }

                    } catch (error) {
                        throw error;
                    }
                } else {
                    console.error('Card not found for ID:', createGiftDTO.cardID);
                }
            }


            const senderName = senderUser?.fullName || senderUser?.firstName || senderUser?.lastName || senderUser?.phone;
            this.sendSmsToSenderUser(senderName, senderUser.phone, (receiverUser?.user?.fullName || createGiftDTO.receiverName), createGiftDTO.totalGiftSum);
            // create notification for sender
            const notificationData = {
                title: `${senderName}, המתנה שלך נשלחה 🎁`,
                message: `המתנה ששלחת ל${receiverUser.user.fullName} נשלחה בהצלחה!`,
                type: 'greeting',
                userId: senderUser.id,
            };
            await this.notificationService.createNotification(notificationData);

            console.log('Saving greeting...');
            await greeting.save();
            event.greetings.push(greeting);
            console.log('Saving event...');
            await event.save();
            return greeting;
        } catch (error) {
            console.error('Error in event creation:', error);
            throw error;
        }
    }

    private sendSmsToSenderUser(
        sender: string,
        senderPhone: string,
        receiver: string,
        totalGiftSum: number
    ) {
        const actionText =
            totalGiftSum > 0
                ? `שלחת ${totalGiftSum}₪ עבור ${receiver}`
                : `שלחת ברכה עבור ${receiver}`;

        const message = `היי ${sender}! ${actionText}. חברך יקבל את המתנה בתאריך המועד שבחרת. תודה שהשתמשת באפליקציה שלנו`;

        this.smsService.sendSms(senderPhone, message);
        this.smsService.sendWhatsappMessage(senderPhone, message);
    }

    private async notifyAdminsOnTransaction(senderUser: User, receiverUser: {
        user: User;
        isNew: boolean
    }, createGiftDTO: SendGiftDTO, fee: number) {

        const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>עדכון | נשלחה מתנה חדשה</title>
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
                    <p><strong>מקבל:</strong> <span class="highlight">${receiverUser.user.fullName}</span></p>
                    <p><strong>תאריך העסקה:</strong> <span class="highlight">${new Date().toLocaleDateString('he-IL')}</span></p>
                    <p><strong>תאריך האירוע:</strong> <span class="highlight">${new Date(createGiftDTO.eventYear, createGiftDTO.eventMonth - 1, createGiftDTO.eventDay).toLocaleDateString('he-IL')}</span></p>
                    <p><strong>סכום המתנה:</strong> <span class="highlight">${createGiftDTO.totalGiftSum} ש"ח</span></p>
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


}
