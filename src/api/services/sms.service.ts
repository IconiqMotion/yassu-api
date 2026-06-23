import {Service} from "typedi";
import getConfig from "../../config/env.config";
const axios = require('axios');

const SMS4FREE_ENDPOINT = 'https://api.sms4free.co.il/ApiSMS/v2/SendSMS';

@Service()
export class SmsService {
	private config = getConfig();

	async sendSms(to: string, text: string, senderName: string = getConfig().smsAuth.senderName) {
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
			});
			if (response.data > 0) {
				console.log('sms sent successfully to number - ' + to);
			} else {
				console.log('failed to send sms to number - ' + to + ' - error code: ' + response.data);
			}
		} catch (error: any) {
			console.log('error in sending sms to number - ' + to + ' - ' + error);
			console.log('sms4free response:', JSON.stringify(error.response?.data));
			console.log('sms4free credentials check - key:', sms4freeKey ? 'SET' : 'MISSING', 'user:', sms4freeUser ? 'SET' : 'MISSING', 'pass:', sms4freePass ? 'SET' : 'MISSING');
		}
	}

	sendWhatsappMessage(phone: string, text: string) {
		let sanitizedPhone = phone.replace(/\D/g, ''); // Remove non-digits
		if (sanitizedPhone.startsWith('0')) {
			sanitizedPhone = sanitizedPhone.substring(1);
		}
		if (!sanitizedPhone.startsWith('972')) {
			sanitizedPhone = '972' + sanitizedPhone;
		}

		const instanceId = this.config.greenApi.instanceId;
		const token = this.config.greenApi.token;
		const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`;

		const body = {
			chatId: sanitizedPhone + "@c.us",
			message: text,
		};

		axios.post(url, body)
			.then((response: any) => {
				if (response.status === 200) {
					console.log('whatsapp message sent successfully to - ' + sanitizedPhone);
				} else {
					console.log('failed to send whatsapp message to - ' + sanitizedPhone);
				}
			})
			.catch((error: any) => {
				console.log('error sending whatsapp message to - ' + sanitizedPhone + ' - ' + error);
			});
	}
}
