import { User } from '../api/models/user.model';
import getConfig from './env.config';
import { Verification } from '../api/models/verification.model';
import {CreditCard} from "../api/models/credit-card.model";
import {Transaction} from "../api/models/transaction.model";
import {Event} from "../api/models/event.model";
import {Greeting} from "../api/models/greeting.model";
import {CreditCardRequest} from "../api/models/credit-card-request.model";
import {Transfer} from "../api/models/transfers.model";
import {InternalTransaction} from "../api/models/internal-transaction.model";
import {Group} from "../api/models/group.model";
import {GroupMember} from "../api/models/group-member.model";
import {Notification} from "../api/models/notification.model";
import {Admin} from "../api/models/admin.model";
import {BankAccount} from "../api/models/bank-account.model";

const config = getConfig();

const ormConfig = {
	type: 'postgres',
	host: config.dbHost,
	port: config.dbPort,
	username: config.dbUser,
	password: config.dbPass,
	database: config.dbName,
	entities: [
		User,
		Verification,
		CreditCard,
		CreditCardRequest,
		Transaction,
		Event,
		Greeting,
		Transfer,
		InternalTransaction,
		Group,
		GroupMember,
		Notification,
		Admin,
		BankAccount
	],
	synchronize: config.synchronize === true,
	logging: false,
	dropSchema: config.dropSchema === true,
	ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

export = ormConfig;

