import { plainToInstance } from 'class-transformer';
import { Request, Response } from 'express';
import { Container } from 'typedi';
import { ResHandlerService } from '../services/res-handler.service';
import { BadRequestError, NotFoundError } from '../errors';
import { NotificationService } from '../services/notification.service';
import { GetAllNotificationsDTO } from '../dto/notification/getAllNotificationsDTO';
import { MarkAsReadDTO } from '../dto/notification/markAsReadDTO';

const resService = Container.get(ResHandlerService);
const notificationService = Container.get(NotificationService);

export const getAllNotifications = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        if (!userId) {
            return resService.handleError(res, new BadRequestError(
                'auth.error',
                'User not authenticated',
                null
            ));
        }

        const transformed = plainToInstance(GetAllNotificationsDTO, req.query) as GetAllNotificationsDTO;
        const data = await notificationService.getAllNotificationsByUserId(
            userId, 
            transformed.page, 
            transformed.limit
        );
        
        return resService.handleSuccess(res, data);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to fetch notifications',
            e
        ));
    }
};

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        if (!userId) {
            return resService.handleError(res, new BadRequestError(
                'auth.error',
                'User not authenticated',
                null
            ));
        }

        const count = await notificationService.getUnreadNotificationsCount(userId);
        
        return resService.handleSuccess(res, { count });
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to fetch unread count',
            e
        ));
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        if (!userId) {
            return resService.handleError(res, new BadRequestError(
                'auth.error',
                'User not authenticated',
                null
            ));
        }

        const transformed = plainToInstance(MarkAsReadDTO, req.body) as MarkAsReadDTO;
        const notification = await notificationService.markAsRead(transformed.id, userId);
        
        if (!notification) {
            return resService.handleError(res, new NotFoundError(
                'notification.not_found',
                'Notification not found',
                null
            ));
        }

        return resService.handleSuccess(res, notification);
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to mark notification as read',
            e
        ));
    }
};

export const generateTestNotifications = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        if (!userId) {
            return resService.handleError(res, new BadRequestError(
                'auth.error',
                'User not authenticated',
                null
            ));
        }

        const notifications = await notificationService.generateTestNotifications(userId);
        
        return resService.handleSuccess(res, {
            message: 'Test notifications generated successfully',
            notifications,
            count: notifications.length
        });
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to generate test notifications',
            e
        ));
    }
};

export const deleteAllNotifications = async (req: Request, res: Response) => {
    try {
        const userId = (req.user as any)?.id;
        if (!userId) {
            return resService.handleError(res, new BadRequestError(
                'auth.error',
                'User not authenticated',
                null
            ));
        }

        const deletedCount = await notificationService.deleteAllUserNotifications(userId);
        
        return resService.handleSuccess(res, {
            message: 'All notifications deleted successfully',
            deletedCount
        });
    } catch (e) {
        return resService.handleError(res, new BadRequestError(
            'general.error',
            'Failed to delete notifications',
            e
        ));
    }
};
