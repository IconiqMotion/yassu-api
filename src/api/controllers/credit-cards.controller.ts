import { plainToInstance } from 'class-transformer';

import { Request, Response } from 'express';
import { Container } from 'typedi';
import { ResHandlerService } from '../services/res-handler.service';
import { BadRequestError } from '../errors';
import { SmsService } from '../services/sms.service';
import { AuthService } from '../services/auth.service';
import getConfig from '../../config/env.config';
import { RegisterDTO } from '../dto/auth/registerDTO';
import { UsersService } from "../services/users.service";
import { SendGiftDTO } from "../dto/sendGiftDTO";
import { GiftService } from "../services/gift.service";
import { User } from "../models/user.model";
import { CreditCardsService } from "../services/creditCardsService";
import { IdDTO } from "../dto/IdDTO";
import { AddCreditCardDTO } from "../dto/addCreditCardDTO";
import { PaymentService } from "../services/payment.service";

const resService = Container.get(ResHandlerService);
const cardsService = Container.get(CreditCardsService);
const paymentService = Container.get(PaymentService);
const config = getConfig();

export const getAllCards = async (req: Request, res: Response) => {
	try {
		const data = await cardsService.findUserCards((req.user as User).id);
		return resService.handleSuccess(res, data);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};
export const feeDetails = async (req: Request, res: Response) => {
	const fee = config.fee ?? 10;
	const response = {
		fee: fee,
		// Don't show fee message if fee is 0
		feeMessage: fee > 0 ? `לסכום זה תתווסף עמלה בסך ${fee} ש"ח` : '',
		feeTooltip: fee > 0 ? `לסכום זה תתווסף עמלה בסך ${fee} ש"ח` : ''
	}
	return resService.handleSuccess(res, response);
}

export const getIframeURL = async (req: Request, res: Response) => {
	try {
		// get query parameters
		const query = req.query;
		const sum = query.sum ? parseInt(query.sum as string) : 0;
		const data = await cardsService.getIframe((req.user as User));
		return resService.handleSuccess(res, data);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const successAddPaymentCard = async (req: Request, res: Response) => {
	res.setHeader('Content-Type', 'text/html');
	const success = true;
	console.log("successAddPaymentCard", req.body);

	const htmlContent = `
    <html>
      <body>
        <script>
          window.parent.postMessage({ success: ${success} }, '*');
        </script>
      </body>
    </html>
  `;
	res.send(htmlContent);
};

/**
 * Handler for a failed addition of a new payment card.
 * Sends an HTML response that posts a failure message to the parent window.
 */
export const failAddPaymentCard = (req: Request, res: Response): void => {
	res.setHeader('Content-Type', 'text/html');
	const success = false;
	console.log("failAddPaymentCard", req.body);

	const htmlContent = `
    <html>
      <body>
        <script>
          window.parent.postMessage({ success: ${success} }, '*');
        </script>
      </body>
    </html>
  `;
	res.send(htmlContent);
};

export const getHistory = async (req: Request, res: Response) => {
	try {
		const t = await cardsService.getUserVirtualCardTransactions((req.user as User).id);
		return resService.handleSuccess(res, t);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const completeAddingNewCard = async (req: Request, res: Response) => {
	try {
		const reqId = req.params.uuid;
		const query = req.body;
		const result = await cardsService.completeAddingNewCard(+reqId, query);
		return resService.handleSuccess(res, {});
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const deleteCard = async (req: Request, res: Response) => {
	try {
		const transformed = plainToInstance(IdDTO, req.params) as IdDTO;
		await cardsService.delete(transformed.id);
		return resService.handleSuccess(res, {});
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const addCard = async (req: Request, res: Response) => {
	try {
		const transformed = plainToInstance(AddCreditCardDTO, req.body) as AddCreditCardDTO;
		const creditCardReq = await paymentService.fetchTransactionDetails(transformed.reqId);
		if (creditCardReq.used) {
			return resService.handleError(res, new BadRequestError(
				'general.error',
				'err',
				new Error('Credit card request already used')
			));
		}
		const created = await cardsService.create(transformed, creditCardReq);
		return resService.handleSuccess(res, created);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const paymeCb = async (req: Request, res: Response) => {
	try {
		//await cardsService.paymeCb(req.body);
		return resService.handleSuccess(res, { ok: true });
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};
