import { Service } from 'typedi';
import { Repository, getRepository } from 'typeorm';
import { Notification } from '../models/notification.model';
import { User } from '../models/user.model';

@Service()
export class NotificationService {
    private repo: Repository<Notification>;

    getRepository() {
        if (!this.repo) {
            this.repo = getRepository(Notification);
        }
        return this.repo;
    }

    async getAllNotificationsByUserId(userId: number, page: number = 1, limit: number = 20): Promise<{ notifications: Notification[], total: number }> {
        const [notifications, total] = await this.getRepository().findAndCount({
            where: { userId },
            order: { _createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit
        });

        return { notifications, total };
    }

    async getUnreadNotificationsCount(userId: number): Promise<number> {
        return await this.getRepository().count({
            where: { userId, isRead: false }
        });
    }

    async markAsRead(notificationId: number, userId: number): Promise<Notification | null> {
        const notification = await this.getRepository().findOne({
            where: { id: notificationId, userId }
        });

        if (!notification) {
            return null;
        }

        notification.isRead = true;
        notification.readAt = new Date();
        
        return await this.getRepository().save(notification);
    }

    async createNotification(data: {
        title: string;
        message: string;
        type: string;
        userId: number;
    }): Promise<Notification> {
        const notification = this.getRepository().create({
            title: data.title,
            message: data.message,
            type: data.type,
            userId: data.userId,
            isRead: false
        });

        return await this.getRepository().save(notification);
    }

    async generateTestNotifications(userId: number): Promise<Notification[]> {
        const testNotifications = [
            {
                title: 'הודעה חדשה',
                message: 'יש לך הודעה חדשה ממשתמש',
                type: 'message',
                userId
            },
            {
                title: 'העברה התקבלה',
                message: 'התקבלה אליך העברה בסך 1000₪',
                type: 'payment',
                userId
            },
            {
                title: 'הודעת מערכת',
                message: 'עדכון המערכת מתוכנן למחר',
                type: 'system',
                userId
            },
            {
                title: 'הזמנה לקבוצה',
                message: 'הוזמנת לקבוצה "כספים משפחתיים"',
                type: 'group',
                userId
            },
            {
                title: 'ברכת יום הולדת',
                message: 'יום הולדת שמח! מאחלים לך את כל הטוב!',
                type: 'greeting',
                userId
            }
        ];

        const createdNotifications = [];
        for (const notificationData of testNotifications) {
            const notification = await this.createNotification(notificationData);
            createdNotifications.push(notification);
        }

        return createdNotifications;
    }

    async deleteAllUserNotifications(userId: number): Promise<number> {
        const result = await this.getRepository().delete({ userId });
        return result.affected || 0;
    }
}
