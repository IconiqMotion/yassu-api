import admin from 'firebase-admin';
import getConfig from '../../config/env.config';
import Logger from '../../config/logger.config';
import { Service } from 'typedi';
import path from 'path';
@Service()
export class PushService {
	constructor() {
		if (!admin.apps.length) {
			admin.initializeApp({
				credential: admin.credential.cert(path.resolve(__dirname, '../../firebase-admin-sdk.json')),
			});
		}
	}

	async send(user: string, message: string, body: string, extraData: Record<string, any>) {
		try {
			const payload = {
				notification: {
					title: message,
					body: body,
				},
				data: {
					...extraData
				},
				token: user,
			};

			// Assuming `user` is the FCM token
			const response = await admin.messaging().send(payload);

			Logger.info('Push notification sent successfully');
			console.log(response);
		} catch (err) {
			Logger.error('Error sending push notification');
			console.log(err);
		}
	}
}
