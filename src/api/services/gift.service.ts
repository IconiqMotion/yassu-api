import {Service} from 'typedi'
import {PaymentService} from "./payment.service";
import {SendGiftDTO} from "../dto/sendGiftDTO";
import {EventService} from "./event.service";
import {Brackets, Column, getRepository, ManyToOne, Repository} from "typeorm";
import {Greeting} from "../models/greeting.model";
import {User} from '../models/user.model';
import {UsersService} from "./users.service";
import {Transaction} from "../models/transaction.model";
import {ETransactionType} from "../models/enums";
import { parsePhone } from './utils.service';
import {CreditCard} from "../models/credit-card.model";
import {SmsService} from "./sms.service";
import {getCelebratingUsers} from "../controllers/gift.controller";
import {Transfer} from "../models/transfers.model";
import {Event} from "../models/event.model";
import {InternalTransaction} from "../models/internal-transaction.model";
import {EmailService} from "./email.service";
import {PushService} from "./push.service";

@Service()
export class GiftService {

    private repo: Repository<Greeting>;

    constructor(private eventService: EventService,
                private emailService: EmailService,
                private smsService: SmsService,
                private pushService: PushService,
                private userService: UsersService,
                private paymentService: PaymentService) {}

    getRepository() {
        if (!this.repo) {
            this.repo = getRepository(Greeting)
        }
        return this.repo;
    }

    async mySentGreetings(user: User) {
        return this.getRepository().find({where: {senderUser: user.id},
            relations: ['event', 'receiverUser']});
    }

    async getCelebratingUsers(currentUser: User) {
        const today = new Date();
        const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed, so add 1
        const nextMonth = (currentMonth % 12) + 1; // Get the next month (wrap around from December to January)

        // Helper function to get users celebrating in a specific month
        async function getCelebratingUsersByMonth(month: number) {
            return await getRepository(User)
                .createQueryBuilder('user')
                .leftJoin(Event, 'event', 'event.receiverUserId = user.id OR event.receiverUserId = :currentUserId', { currentUserId: currentUser.id })
                .leftJoin(Greeting, 'greetingSender', 'greetingSender.senderUserId = user.id AND greetingSender.eventId = event.id')
                .leftJoin(Greeting, 'greetingReceiver', 'greetingReceiver.receiverUserId = user.id AND greetingReceiver.eventId = event.id')
                .where('user.firstName IS NOT NULL AND user.firstName != \'\'')
                .getMany();
        }

        // Get users celebrating this month and next month
        const celebratingThisMonth = await getCelebratingUsersByMonth(currentMonth);
        const celebratingNextMonth = await getCelebratingUsersByMonth(nextMonth);

        return {
            celebratingThisMonth,
            celebratingNextMonth
        };
    }

    async myReceivedGreetings(user: User) {
        return this.getRepository().find({
            where: {
                receiverUser: user.id,
                event: {
                    finishedProcessing: true
                }
            },
            relations: ['event', 'senderUser']
        });
    }


    private async notifyAdminsOnTransaction(senderUser: User, receiverUser: {
        user: User;
        isNew: boolean
    }, createGiftDTO: SendGiftDTO, fee: number) {
        const internalTransaction = await InternalTransaction.create({
            receiverUser: receiverUser.user.id,
            amount: createGiftDTO.totalGiftSum,
            fee,
            transactionDate: new Date(),
            // eventDate: new Date(createGiftDTO.eventYear, createGiftDTO.eventMonth - 1, createGiftDTO.eventDay),
            isPaid: false
        }).save();

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

    private sendSmsToSenderUser(sender: string, senderPhone: string, receiver: string, totalGiftSum: number) {
        const message = `היי ${sender}! שלחת ${totalGiftSum}₪ עבור ${receiver}. חברך יקבל את המתנה בתאריך המועד שבחרת. תודה שהשתמשת באפליקציה שלנו`;
        this.smsService.sendSms(senderPhone, message);
    }

    async getInternalTransactions() {
        // order by eventDate desc
        return InternalTransaction.find({ relations: ['receiverUser'] });
    }

    async updateTransaction(id: number, comment: string) {
        const transaction = await InternalTransaction.findOne({where: {id}, relations: ['senderUser', 'receiverUser']});
        if (transaction) {
            transaction.isPaid = true;
            if (comment) {
                transaction.comment = comment;
            }
            await transaction.save();
        }
        // send push to receiver
        const user = transaction.receiverUser as User;
        if (user.fcmToken) {
            await this.pushService.send(user.fcmToken, '🎁' + user.firstName + ' העברנו לחשבונך סכום של ' + transaction.amount + ' ש"ח, יאסו!' + '🎁', '', {});
        }
        return transaction;
    }
}
