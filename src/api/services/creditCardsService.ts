import {Service} from 'typedi'
import {DeepPartial, Repository, getRepository, Column} from 'typeorm'
import {EmailService} from './email.service';
import {User} from "../models/user.model";
import {FindOneOptions} from "typeorm/find-options/FindOneOptions";
import {PaymentService} from "./payment.service";
import {CreditCard} from "../models/credit-card.model";
import {AddCreditCardDTO} from "../dto/addCreditCardDTO";
import { UsersService } from './users.service';
import {CreditCardRequest} from "../models/credit-card-request.model";
import {CardcomService} from "./cardcom.service";

@Service()
export class CreditCardsService {
    private repo: Repository<CreditCard>;

    constructor(private paymentService: PaymentService, private userService: UsersService, private cardComService: CardcomService) {
    }

    getRepository() {
        if (!this.repo) {
            this.repo = getRepository(CreditCard)
        }
        return this.repo;
    }

    findUserCards(userID: number) {
        return this.getRepository().find({ user: userID });
    }

    async getIframe(user: User) {
        const creditCardRequest = await CreditCardRequest.create({user: user.id}).save();
        const iframeData = await this.cardComService.getPaymentIframe(creditCardRequest.id);
        if (iframeData.lowProfileId) {
            creditCardRequest.lowProfileId = iframeData.lowProfileId;
            await creditCardRequest.save();
        }
        return iframeData;
    }

    async create(dto: AddCreditCardDTO, creditCardReq: CreditCardRequest) {
        return;
    }

    delete(cardID: number) {
        return this.getRepository().delete(cardID);
    }

    async completeAddingNewCard(id: number, payload: any) {
        const creditCardReq = await CreditCardRequest.findOne({ where: { id } });
        if (!creditCardReq) {
            throw new Error('Credit card request not found');
        }
        await this.saveCardFromWebhookPayload(creditCardReq, payload);
    }

    async completeAddingNewCardByLowProfileId(lowProfileId: string, payload: any) {
        const creditCardReq = await CreditCardRequest.findOne({ where: { lowProfileId } });
        if (!creditCardReq) {
            throw new Error(`Credit card request not found for LowProfileId ${lowProfileId}`);
        }
        await this.saveCardFromWebhookPayload(creditCardReq, payload);
    }

    private async saveCardFromWebhookPayload(creditCardReq: CreditCardRequest, payload: any) {
        if (creditCardReq.used) {
            return;
        }

        function convertTokenToDate(dateString: string): Date {
            const year = parseInt(dateString.substring(0, 4), 10);
            const month = parseInt(dateString.substring(4, 6), 10) - 1;
            const day = parseInt(dateString.substring(6, 8), 10);
            return new Date(year, month, day);
        }

        function getTwoDigitYear(cardYear: number): number {
            return cardYear % 100;
        }
        function formatCardMonth(cardMonth: number): string {
            return cardMonth.toString().padStart(2, '0');
        }

        const expiration = convertTokenToDate(payload.TokenInfo.TokenExDate);
        const year = getTwoDigitYear(payload.TokenInfo.CardYear);
        const month = formatCardMonth(payload.TokenInfo.CardMonth);

        const cardExpirationMMYY = `${month}${year}`;

        const newCard = CreditCard.create({
            token: payload.TokenInfo.Token,
            cardYear: payload.TokenInfo.CardYear?.toString(),
            cardMonth: payload.TokenInfo.CardMonth?.toString(),
            cardOwnerName: payload.TranzactionInfo.CardOwnerName,
            cardOwnerEmail: payload.TranzactionInfo.CardOwnerEmail,
            cardOwnerPhone: payload.TranzactionInfo.CardOwnerPhone,
            last4CardDigits: payload.TranzactionInfo.Last4CardDigitsString,
            brand: payload.TranzactionInfo.Brand,
            expiration,
            cardOwnerIdentityNumber: payload.TranzactionInfo.CardOwnerIdentityNumber,
            cardExpirationMMYY: cardExpirationMMYY,
            user: creditCardReq.userId
        });

        await newCard.save();

        creditCardReq.used = true;
        await creditCardReq.save();
    }

    async getUserVirtualCardTransactions(id: number) {
        return;
    }

    // async paymeCb(data: any) {
    //     const paymeID = data.seller_payme_id;
    //     const notifyType = data.notify_type; //: 'seller-update'
    //     const sellerApproved = Number(data.seller_approved || 0);
    //
    //     if (notifyType == 'seller-update') {
    //         const user = await User.findOne({paymeSellerID: paymeID});
    //         if (user) {
    //             user.awaitingPaymeReview = sellerApproved == 0;
    //             user.paymeInit = false;
    //             user.completedPaymeSellerSetup = true;
    //             await user.save();
    //         }
    //     }
    //
    //     return {message: 'ok'};
    // }
}
