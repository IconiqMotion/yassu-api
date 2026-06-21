import {Service} from 'typedi'
import {DeepPartial, Repository, getRepository, Column} from 'typeorm'
import {EmailService} from './email.service';
import {User} from "../models/user.model";
import {FindOneOptions} from "typeorm/find-options/FindOneOptions";
import {PaymentService} from "./payment.service";
import {CreditCard} from "../models/credit-card.model";
import {AddCreditCardDTO} from "../dto/addCreditCardDTO";
import {UsersService} from "./users.service";

@Service()
export class VirtualCardService {

    constructor(private paymentService: PaymentService, private userService: UsersService) {
    }

    async getUserVirtualCardData(userID: number) {
        return;
        // const user = await this.userService.findOne(userID);
        // if (!user.payLollyCardId) {
        //     throw new Error('User has no virtual card');
        // }
        // const cardData = await this.paymentService.cardDetails(user.payLollyCardId);
        // // parse the response
        // return cardData.data.card;
    }

}
