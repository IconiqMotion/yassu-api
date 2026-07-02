import {Router} from 'express';
import {validationMiddleware} from '../middlewares/validation.middleware';
import {isAuthenticatedGuard} from "../guards";
import {SendGiftDTO} from "../dto/sendGiftDTO";
import {
    addCard, cardWebhook, completeAddingNewCard,
    deleteCard, failAddPaymentCard,
    getAllCards,
    getHistory,
    getIframeURL,
    feeDetails,
    paymeCb, successAddPaymentCard
} from "../controllers/credit-cards.controller";
import {AddCreditCardDTO} from "../dto/addCreditCardDTO";
import {IdDTO} from "../dto/IdDTO";
import {updateProfile} from "../controllers/auth.controller";

export const router = Router();

router.get('/', isAuthenticatedGuard, getAllCards);
router.get('/iframe', isAuthenticatedGuard, getIframeURL);
router.get('/history', isAuthenticatedGuard, getHistory);
router.delete('/:id', isAuthenticatedGuard, validationMiddleware(IdDTO), deleteCard);

router.get('/success-add-payment-card', successAddPaymentCard);
router.get('/fail-add-payment-card', failAddPaymentCard);
router.get('/fee', feeDetails);
router.post('/add-payment-card/:uuid', completeAddingNewCard);
router.post('/webhook', cardWebhook);