import {plainToInstance} from 'class-transformer';
import {Request, Response} from 'express';
import {Container} from 'typedi';
import {ResHandlerService} from '../services/res-handler.service';
import {BadRequestError} from '../errors';
import {SmsService} from '../services/sms.service';
import {AuthService} from '../services/auth.service';
import getConfig from '../../config/env.config';
import {RegisterDTO} from '../dto/auth/registerDTO';
import {VerifyDTO} from '../dto/auth/verifyDTO';
import {User} from '../models/user.model';
import {UsersService} from "../services/users.service";
import {UpdateProfileDTO} from "../dto/auth/updateProfileDTO";
import {PaymentService} from "../services/payment.service";
import {FinanceDTO} from "../dto/auth/financeDTO";

const resService = Container.get(ResHandlerService);
const smsService = Container.get(SmsService);
const userService = Container.get(UsersService);
const authService = Container.get(AuthService);
const paymentService = Container.get(PaymentService);

const config = getConfig();

export const register = async (req: Request, res: Response) => {
	try {
		const transformed = plainToInstance(RegisterDTO, req.body) as RegisterDTO;
		await authService.register(transformed);
		return resService.handleSuccess(res, { phone: transformed.phone });
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const verify = async (req: Request, res: Response) => {
	try {
		const transformed = plainToInstance(VerifyDTO, req.body) as VerifyDTO;
		const data = await authService.verify(transformed);
		return resService.handleSuccess(res, data);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const deleteProfile = async (req: Request, res: Response) => {
	try {
		const userId = (req.user as User).id;
		const data = await authService.deleteProfile(userId);
		return resService.handleSuccess(res, data);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			e.message,
			'err',
			e
		));
	}
};

export const updateProfile = async (req: Request, res: Response) => {
	try {
		const userId = (req.user as User).id;
		const transformed = plainToInstance(UpdateProfileDTO, req.body) as UpdateProfileDTO;
		const user = await authService.updateProfile(transformed, userId);
		return resService.handleSuccess(res, user);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const me = async (req: Request, res: Response) => {
	try {
		const userId = (req.user as User).id;
		const user = await userService.getUserById(userId);
		return resService.handleSuccess(res, user);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};
