import { Service } from 'typedi';
import axios, {AxiosInstance, AxiosResponse} from "axios";
import getConfig from "../../config/env.config";
import HmacSHA256 from 'crypto-js/hmac-sha512';
import Hex from 'crypto-js/enc-hex';
import * as CryptoJS from 'crypto-js'
import {IssueCardResponse} from "../dto/response/issue-card.response";
import {CardDetailsResponse} from "../dto/response/card-details.response";
import {CreditCardRequest} from "../models/credit-card-request.model";
import {CreditCard} from "../models/credit-card.model";
import {User} from "../models/user.model";
import path from "path";
import {Transfer} from "../models/transfers.model";
import {FinanceDTO} from "../dto/auth/financeDTO";

/**
 * NodeJS wrapper to Pay Lolly API
 *
 * @publicApi
 */
@Service()
export class CardcomService {
	private readonly axiosInstance: AxiosInstance;
	private paymentUrl = '';
	constructor() {
		this.paymentUrl = getConfig().cardCom.baseURL;
	}
	/**
	 * Get payment iframe
	 *
	 * @param userId
	 * @param userName
	 */
	async getPaymentIframe(requestId: number) {
		let response;
		try {
			response = await axios.post(
				`${this.paymentUrl}/LowProfile/Create`,
				{
					SuccessRedirectUrl: `${getConfig().serverUrl}/card/success-add-payment-card`,
					FailedRedirectUrl: `${getConfig().serverUrl}/card/fail-add-payment-card`,
					WebHookUrl: `${getConfig().serverUrl}/card/add-payment-card/${requestId}`,
					TerminalNumber: getConfig().cardCom.terminalId,
					ApiName: getConfig().cardCom.apiName,
					Operation: 'CreateTokenOnly',
					Amount: 1,
				},
				{headers: {'Content-Type': 'application/json'}}
			);
		} catch (e) {
			throw new Error(`CardCom LowProfile/Create request failed: ${e?.response ? JSON.stringify(e.response.data) : e?.message}`);
		}
		const data = response.data;
		if (data.ResponseCode !== 0) {
			throw new Error(`CardCom rejected LowProfile/Create (ResponseCode ${data.ResponseCode}): ${data.Description || 'no description returned'}`);
		}
		return { success: true, url: data.Url || '', requestId };
	}
	/**
	 * Get payment iframe
	 *
	 * @param userId
	 * @param userName
	 */
	async getPaymentIframeAndCharge(requestId: number, sum: number) {
		const response = await axios.post(
			`${this.paymentUrl}/LowProfile/Create`,
			{
				SuccessRedirectUrl: `${getConfig().serverUrl}/card/success-add-payment-card`,
				FailedRedirectUrl: `${getConfig().serverUrl}/card/fail-add-payment-card`,
				WebHookUrl: `${getConfig().serverUrl}/card/add-payment-card/${requestId}`,
				TerminalNumber: getConfig().cardCom.terminalId,
				ApiName: getConfig().cardCom.apiName,
				Operation: 'ChargeAndCreateToken',
				Amount: sum,
			},
			{headers: {'Content-Type': 'application/json'}}
		);
		const data = response.data;
		if (data.ResponseCode !== 0) {
			throw new Error('Error while creating payment card');
		}
		return { success: true, url: data.Url || '', requestId };
	}

	 async chargePayment(
		 sum: number,
		 token: string,
		 cardExpirationMMYY: string,
		 clientData?: {
			 name: string;
			 email: string;
			 mobile: string;
			 productDescription: string;
		 }
	 ) {
		 const payload: any = {
			 TerminalNumber: getConfig().cardCom.terminalId,
			 ApiName: getConfig().cardCom.apiName,
			 //Amount: sum,
			 Amount: 5,
			 Token: token,
			 CardExpirationMMYY: cardExpirationMMYY,
			 Advanced: {
				 ApiPassword: getConfig().cardCom.TerminalPass,
			 },
		 };

		 // if (clientData && clientData.email) {
			//  payload.Document = {
			// 	 Name: clientData.name,
			// 	 Email: clientData.email,
			// 	 Mobile: clientData.mobile,
			// 	 IsVatFree: false,
			// 	 Products: [
			// 		 {
			// 			 Description: clientData.productDescription,
			// 			 UnitCost: sum,
			// 		 },
			// 	 ],
			//  };
		 // }

		 const response = await axios.post(
			 `${this.paymentUrl}/Transactions/Transaction`,
			 payload,
			 {headers: {'Content-Type': 'application/json'}}
		 );
		 return response.data;
	 }
}

