import {plainToInstance} from 'class-transformer';

import {Request, Response} from 'express';
import {Container} from 'typedi';
import {ResHandlerService} from '../services/res-handler.service';
import {BadRequestError} from '../errors';
import {SmsService} from '../services/sms.service';
import {AuthService} from '../services/auth.service';
import getConfig from '../../config/env.config';
import {RegisterDTO} from '../dto/auth/registerDTO';
import {UsersService} from "../services/users.service";
import {SendGiftDTO} from "../dto/sendGiftDTO";
import {GiftService} from "../services/gift.service";
import {User} from "../models/user.model";

const resService = Container.get(ResHandlerService);
const giftService = Container.get(GiftService);
const config = getConfig();

export const getInternalTransactions = async (req: Request, res: Response) => {
	try {
		const created = await giftService.getInternalTransactions();
		return resService.handleSuccess(res, created);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const updateTransaction = async (req: Request, res: Response) => {
	try {
		const id = req.params.id;
		const comment = req.body?.comment;
		const created = await giftService.updateTransaction(+id, comment);
		return resService.handleSuccess(res, created);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const mySentGreetings = async (req: Request, res: Response) => {
	try {
		const created = await giftService.mySentGreetings((req.user as User));
		return resService.handleSuccess(res, created);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const getCelebratingUsers = async (req: Request, res: Response) => {
	try {
		const created = await giftService.getCelebratingUsers((req.user as User));
		return resService.handleSuccess(res, created);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const getCommission = async (req: Request, res: Response) => {
	try {
		const commissions = {
			sendMoney: {
				rules: [
					{
						default: true,
						fixed: 10
					}
				]
			},
			withdrawMoney: {
				rules: [
					{
						lessThan: 600,
						fixed: 20
					},
					{
						default: true,
						fixed: 50
					}
				]
			}
		};
		return resService.handleSuccess(res, commissions);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const myReceivedGreetings = async (req: Request, res: Response) => {
	try {
		const created = await giftService.myReceivedGreetings((req.user as User));
		return resService.handleSuccess(res, created);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};
