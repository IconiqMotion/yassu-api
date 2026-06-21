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
export class PaymentService {
	private readonly axiosInstance: AxiosInstance;
	private readonly cardPrefix = '/card';
	private readonly salesPrefix = '/sales';
	private readonly paymentPrefix = '/gw/payment';
	private readonly transactionPrefix = '/gw/transaction';
	private readonly ILSCurrency = 'ILS';
	private readonly VERIFY = 'verify';

	constructor() {
		// initiate axios instance with pay lolly base url
		this.axiosInstance = axios.create({
			baseURL: getConfig().payMe.baseURL
		});
	}

	/**
	 * prepare require headers in order to call the service
	 * @private
	 */
	private prepareHeaders() {
		const pubKey = 'O3NIBifVMo1WIQMOdozLddorEnRErJ4XXKdFXnW00MsEsEpppq7f7crfq1YLAdsu';
		// generate random hash
		function makeid(length) {
			var result           = '';
			var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
			var charactersLength = characters.length;
			for ( var i = 0; i < length; i++ ) {
				result += characters.charAt(Math.floor(Math.random() * charactersLength));
			}
			return result;
		}

		const unixTime = Math.round((new Date()).getTime() / 1000);
		const nonce = makeid(80);
		const hash = CryptoJS.HmacSHA256(pubKey, getConfig().payLolly.private_key + unixTime + nonce).toString(CryptoJS.enc.Hex);

		return {
			headers: {
				'X-dolcevita-api-request-time': unixTime,
				'X-dolcevita-api-app-key': pubKey,
				'X-dolcevita-api-nonce': nonce,
				'X-dolcevita-api-access-token': hash,
			}
		}
	}

	/**
	 * issue new card
	 *
	 * @param idNumber
	 * @param userName
	 */
	issueCard(idNumber: string, userName: string): Promise<AxiosResponse<IssueCardResponse>> {
		const params = {
			id_number: String(idNumber),
			user_name: userName,
			reseller_id: getConfig().payLolly.reseller_id,
			processor_id: getConfig().payLolly.processor_id,
			currency: this.ILSCurrency,
			response_language: "english"
		}
		return this.axiosInstance.post<IssueCardResponse>(`${this.cardPrefix}/issue`, params, this.prepareHeaders());
	}

	/**
	 * Get card details by card number
	 *
	 * @param cardNumber
	 */
	cardDetails(cardID: number) {
		const params = {
			reseller_id: getConfig().payLolly.reseller_id,
			card_id: cardID,
			response_language: "english"
		}
		return this.axiosInstance.post<CardDetailsResponse>(`${this.cardPrefix}/get`, params, this.prepareHeaders());
	}

	/**
	 * get card transaction history
	 *
	 * @param cardID
	 */
	cardTransactions(cardID: number) {
		const params = {
			reseller_id: getConfig().payLolly.reseller_id,
			card_id: cardID,
			"skip": 0,
			"show": 300,
			response_language: "english"
		}
		return this.axiosInstance.post<CardDetailsResponse>(`${this.cardPrefix}/transactions/get`, params, this.prepareHeaders());
	}

	/**
	 * Add credit to existing card
	 *
	 * @param cardId
	 * @param amount
	 * @param userName
	 */
	cardTopUp(cardId: number, amount: number, userName: string) {
		const params = {
			reseller_id: getConfig().payLolly.reseller_id,
			amount,
			card_id: cardId,
			user_name: userName,
			response_language: "english"
		}
		console.log(params);
		console.log(`${this.cardPrefix}/topup`);
		console.log(this.prepareHeaders());
		return this.axiosInstance.post(`${this.cardPrefix}/topup`, params, this.prepareHeaders());
	}

	/**
	 * Get payment iframe
	 *
	 * @param userId
	 * @param userName
	 */
	getPaymentIframe(creditCardReqId: number): string {
		return `${getConfig().serverUrl}/tokenize?reqId=${creditCardReqId}`;
	}


	/**
	 * Charge credit card with token
	 *
	 * @param token
	 * @param amount
	 * @param userId
	 * @param userName
	 */
	charge(card: CreditCard, amount: number, userId: string, userName: string) {
		const params = {
			seller_payme_id: getConfig().payMe.seller_id,
			sale_price: amount * 100,
			currency: "ILS",
			product_name: "Yassu - " + userName,
			sale_payment_method: "credit-card",
			installments: 1,
			sale_type: "sale",
			buyer_key: card.token,
			capture_buyer: false,
		}
		return this.axiosInstance.post(`/generate-sale`, params);
	}

	async fetchTransactionDetails(reqId: string) {
		const creditCardReq = await CreditCardRequest.findOne({ where: { id: reqId } });
		if (!creditCardReq) {
			throw new Error('Credit card request not found');
		}
		return creditCardReq;
	}

	async transfer(totalAmount: number, receiverUser: User, comment: string = '') {
		if (!receiverUser) {
			console.log('Receiver user is required');
			throw new Error('Receiver user is required');
		}
		await receiverUser.save();
		return Transfer.create({
			amount: totalAmount,
			receiverUser: receiverUser instanceof User ? receiverUser.id : receiverUser,
			date: new Date(),
			comment
		});
	}
}

