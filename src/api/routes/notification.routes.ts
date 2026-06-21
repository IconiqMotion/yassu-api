import { Router } from 'express';
import { validationMiddleware } from '../middlewares/validation.middleware';
import { isAuthenticatedGuard } from '../guards';
import { 
    getAllNotifications, 
    getUnreadCount, 
    markAsRead,
    generateTestNotifications,
    deleteAllNotifications
} from '../controllers/notification.controller';
import { GetAllNotificationsDTO } from '../dto/notification/getAllNotificationsDTO';
import { MarkAsReadDTO } from '../dto/notification/markAsReadDTO';

export const router = Router();

router.get('/', isAuthenticatedGuard, validationMiddleware(GetAllNotificationsDTO), getAllNotifications);
router.get('/unread-count', isAuthenticatedGuard, getUnreadCount);
router.post('/mark-read', isAuthenticatedGuard, validationMiddleware(MarkAsReadDTO), markAsRead);

// Test endpoints
router.post('/test/generate', isAuthenticatedGuard, generateTestNotifications);
router.delete('/test/delete-all', isAuthenticatedGuard, deleteAllNotifications);
