import {Router} from 'express';
import {isAuthenticatedGuard} from "../guards";
import {
    create,
    getEventById,
    getEventByHash,
    getEventHash,
    getMyEvents,
    handleDaily,
    handleTodays,
    withdrawRequest
} from "../controllers/event.controller";
import {validationMiddleware} from "../middlewares/validation.middleware";
import {SendGiftDTO, WithdrawMoneyDTO} from "../dto/sendGiftDTO";

export const router = Router();

const cronTokenGuard = (req: any, res: any, next: any) => {
    const expected = process.env.CRON_TOKEN;
    if (!expected) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.headers['x-cron-token'] !== expected) return res.status(403).json({ success: false, message: 'Forbidden' });
    return next();
};

router.get('/cron', cronTokenGuard, handleTodays);
router.get('/daily', cronTokenGuard, handleDaily);

// Public endpoint (no authentication) - must be before other routes with parameters
router.get('/public/:hash', getEventByHash);

router.post('/', isAuthenticatedGuard, validationMiddleware(SendGiftDTO), create);
router.get('/', isAuthenticatedGuard, getMyEvents);
router.get('/:id/hash', isAuthenticatedGuard, getEventHash); // Get encoded hash for event ID - must be before /:id
router.get('/:id', isAuthenticatedGuard, getEventById);
router.post('/:id/withdraw-request', isAuthenticatedGuard, validationMiddleware(WithdrawMoneyDTO), withdrawRequest);
