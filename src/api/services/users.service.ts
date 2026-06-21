import { Service } from 'typedi'
import { DeepPartial, Repository, getRepository, Column, In } from 'typeorm'
import { EmailService } from './email.service';
import { User } from "../models/user.model";
import { FindOneOptions } from "typeorm/find-options/FindOneOptions";
import { PaymentService } from "./payment.service";
import { Greeting } from "../models/greeting.model";
import { Event } from "../models/event.model";
import {Transfer} from "../models/transfers.model";

@Service()
export class UsersService {
    private repo: Repository<User>;

    constructor(private paymentService: PaymentService) {
    }

    getRepository() {
        if (!this.repo) {
            this.repo = getRepository(User)
        }
        return this.repo;
    }

    findOne(id: number) {
        return this.getRepository().findOne(id);
    }


    async getOrCreateByPhone(phone: string, createInstance: Partial<User>): Promise<{ user: User, isNew: boolean }> {
        createInstance = { ...createInstance, phone } as User;
        const qry: FindOneOptions<User> = { where: { phone, isActive: true } };
        let user = await User.findOne(qry);
        let isNew = false;

        if (!user) {
            isNew = true;
            user = await this.getRepository().create({ ...createInstance, isNew }).save();
        }

        return { user, isNew };
    }

    async getUserById(id: number): Promise<any> {
        const userData = await this.getRepository().findOne(id);
        const userSentGreetings = await Greeting.find({where: {senderUser: id}});
        const userReceivedGreetings = await Greeting.find({where: {receiverUser: id}});
        const events = await Event.find({where: {receiverUser: id, finishedProcessing: true}});
        const totalUnpaidTransfers = await Transfer.find({where: {receiverUser: id, isDone: false}});

        return {
            ...userData,
            transactionsSent: userSentGreetings.filter(g => g.amountOfMoney).reduce((acc, curr) => acc + curr.amountOfMoney, 0),
            greetingsSent: userSentGreetings.length,
            userReceivedGreetings: userReceivedGreetings.filter(g => g.amountOfMoney).reduce((acc, curr) => acc + curr.amountOfMoney, 0)
        };
    }

}
