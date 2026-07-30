import { Service } from 'typedi';
import getConfig from '../../config/env.config';
import { parsePhone } from './utils.service';

const axios = require('axios');

export interface WhatsappSendResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

/**
 * Sends WhatsApp messages through Green API using the business' official number.
 *
 * The Green API instance is configured with GREEN_API_INSTANCE_ID / GREEN_API_TOKEN
 * (see env.config.ts), so the number can be swapped from Heroku config vars without a deploy.
 */
@Service()
export class WhatsappService {
	private get credentials() {
		const { instanceId, token } = getConfig().greenApi || ({} as any);
		return { instanceId, token };
	}

	get isConfigured(): boolean {
		const { instanceId, token } = this.credentials;
		return !!instanceId && !!token;
	}

	async sendMessage(phone: string, text: string): Promise<WhatsappSendResult> {
		const { instanceId, token } = this.credentials;

		if (!instanceId || !token) {
			console.log('whatsapp not configured (GREEN_API_INSTANCE_ID / GREEN_API_TOKEN missing) - skipping send');
			return { success: false, error: 'whatsapp_not_configured' };
		}

		const sanitizedPhone = parsePhone(phone);
		const baseUrl = getConfig().greenApi?.baseUrl || 'https://api.green-api.com';
		const url = `${baseUrl}/waInstance${instanceId}/sendMessage/${token}`;

		try {
			const response = await axios.post(url, {
				chatId: `${sanitizedPhone}@c.us`,
				message: text,
			});

			const messageId = response.data?.idMessage;
			console.log(`whatsapp message sent successfully to - ${sanitizedPhone} - id: ${messageId}`);
			return { success: true, messageId };
		} catch (error: any) {
			const details = error.response?.data ? JSON.stringify(error.response.data) : error.message;
			console.log(`error sending whatsapp message to - ${sanitizedPhone} - ${details}`);
			return { success: false, error: details };
		}
	}
}
