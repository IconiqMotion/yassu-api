import {Service} from "typedi";
import getConfig from "../../config/env.config";
const axios = require('axios');

const SMS4FREE_ENDPOINT = 'https://api.sms4free.co.il/ApiSMS/v2/SendSMS';

/**
 * sms4free answers with a positive number (how many recipients the message went out to)
 * on success, and one of these codes on failure.
 */
const SMS4FREE_ERRORS: { [code: string]: string } = {
	'0': 'general error',
	'-1': 'invalid credentials',
	'-2': 'invalid sender name/number',
	'-3': 'no valid recipients',
	'-4': 'insufficient balance',
	'-5': 'invalid message content',
	'-6': 'sender verification required',
};

export interface SmsSendResult {
	ok: boolean;
	status: number;
	/** raw provider response body, kept for diagnostics */
	raw: any;
	reason?: string;
}

@Service()
export class SmsService {
	private config = getConfig();

	async sendSms(to: string, text: string, senderName: string = getConfig().smsAuth.senderName): Promise<SmsSendResult> {
		console.log('sending sms to ' + to);
		const { sms4freeKey, sms4freeUser, sms4freePass } = this.config.smsAuth;
		try {
			const response = await axios.post(SMS4FREE_ENDPOINT, {
				key: sms4freeKey,
				user: sms4freeUser,
				pass: sms4freePass,
				sender: senderName,
				recipient: to,
				msg: text,
			}, { validateStatus: null }); // sms4free answers 400 with the real reason in the body
			const status = typeof response.data === 'number' ? response.data : response.data?.status ?? response.data;
			if (Number(status) > 0) {
				// log the sender and the full body as well - a positive status only means sms4free
				// accepted the message, so this is what lets us tell "accepted" from "delivered"
				console.log('sms sent successfully to number - ' + to + ' - sender: ' + senderName + ' - response: ' + JSON.stringify(response.data));
				return { ok: true, status: Number(status), raw: response.data };
			}
			const reason = SMS4FREE_ERRORS[String(status)] || ('error code ' + status);
			console.log('failed to send sms to number - ' + to + ' - ' + reason + ' - sender: ' + senderName + ' - response: ' + JSON.stringify(response.data));
			return { ok: false, status: Number(status), raw: response.data, reason };
		} catch (error: any) {
			console.log('error in sending sms to number - ' + to + ' - ' + error.message);
			console.log('sms4free response:', JSON.stringify(error.response?.data));
			console.log('sms4free credentials check - key:', sms4freeKey ? 'SET' : 'MISSING', 'user:', sms4freeUser ? 'SET' : 'MISSING', 'pass:', sms4freePass ? 'SET' : 'MISSING');
			return { ok: false, status: 0, raw: error.response?.data, reason: error.message };
		}
	}

}
