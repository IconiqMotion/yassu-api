import {Router} from 'express';
import {validationMiddleware} from '../middlewares/validation.middleware';
import {isAuthenticatedGuard} from "../guards";
import {SendGiftDTO} from "../dto/sendGiftDTO";
import {
    getCelebratingUsers,
    getCommission,
    getInternalTransactions,
    myReceivedGreetings,
    mySentGreetings,
    updateTransaction
} from "../controllers/gift.controller";

export const router = Router();


router.get('/me', isAuthenticatedGuard, mySentGreetings);
router.get('/sent', isAuthenticatedGuard, mySentGreetings);
router.get('/transactions', isAuthenticatedGuard, getInternalTransactions);
router.put('/transactions/:id', isAuthenticatedGuard, updateTransaction);
router.get('/celebrating', isAuthenticatedGuard, getCelebratingUsers);
router.get('/commission', isAuthenticatedGuard, getCommission);
router.get('/myReceivedGreetings', isAuthenticatedGuard, myReceivedGreetings);
