import {Service} from "typedi";
import getConfig from "../../config/env.config";
const axios = require('axios');

@Service()
export class SmsService {
	private readonly api: any;
	private config = getConfig();

	sendSms(to: string, text: string, senderName: string = getConfig().smsAuth.senderName) {
		console.log('sending sms to ' + to);
		const xmlBody = `<Inforu><User><Username>${this.config.smsAuth.inforukey}</Username><Password>${this.config.smsAuth.inforutoken}</Password></User><Content Type="sms"><Message>${text}</Message></Content><Recipients><PhoneNumber>${to}</PhoneNumber></Recipients><Settings><Sender>${senderName}</Sender></Settings></Inforu>`;
		console.log(this.config.smsAuth.endpoint + xmlBody);
		axios.post(encodeURI(this.config.smsAuth.endpoint + xmlBody))
			.then(function (response) {
				if (response.status == 200) {
					console.log('sms sent successfully to number - ' + to);
				} else {
					console.log('failed to sent to number - ' + to);
				}
			})
			.catch(function (error) {
				console.log('error in sending sms to number - ' + to + ' - ' + error);
			});

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
