import admin from 'firebase-admin';
import getConfig from '../../config/env.config';
import Logger from '../../config/logger.config';
import { Service } from 'typedi';
import path from 'path';
import fs from 'fs';
@Service()
export class PushService {
	constructor() {
		if (admin.apps.length) return;

		if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
			admin.initializeApp({
				credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
			});
			return;
		}

		const localCredentialPath = path.resolve(__dirname, '../../firebase-admin-sdk.json');
		if (fs.existsSync(localCredentialPath)) {
			admin.initializeApp({ credential: admin.credential.cert(localCredentialPath) });
		} else {
			Logger.error('Firebase credentials not configured (FIREBASE_SERVICE_ACCOUNT_JSON) — push notifications disabled');
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
