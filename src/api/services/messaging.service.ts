import { Service } from 'typedi';
import { User } from '../models/user.model';
import { PushService } from './push.service';
import { SmsService } from './sms.service';
import { WhatsappService } from './whatsapp.service';
import { NotificationService } from './notification.service';

export interface NotifyOptions {
	/** Push notification title, also used as the in-app notification title. */
	title: string;
	/** Push body, also used as the in-app notification message. */
	body: string;
	/** Text for WhatsApp / SMS. Falls back to `${title} ${body}` when omitted. */
	text?: string;
	/** Extra FCM data payload — the app reads `action` and `groupId` from it to navigate. */
	data?: Record<string, string>;
	/** In-app notification category ('group' | 'event' | 'greeting' | 'payment' | 'system'). */
	type?: string;
	/** What the notification points at, so a tap can navigate there. */
	entityType?: string;
	entityId?: number;
	/** Channel opt-outs. Every channel is on by default. */
	channels?: {
		push?: boolean;
		whatsapp?: boolean;
		sms?: boolean;
		inApp?: boolean;
	};
}

/**
 * Single fan-out point for user-facing messages: push, WhatsApp, SMS and the in-app
 * notification list. Each channel is isolated so one failing provider never prevents the others
 * from delivering.
 */
@Service()
export class MessagingService {
	constructor(
		private readonly pushService: PushService,
		private readonly smsService: SmsService,
		private readonly whatsappService: WhatsappService,
		private readonly notificationService: NotificationService
	) { }

	async notify(user: User | null | undefined, options: NotifyOptions): Promise<void> {
		if (!user) {
			return;
		}

		const channels = options.channels || {};
		const text = options.text || `${options.title} ${options.body}`.trim();

		if (channels.push !== false && user.fcmToken) {
			try {
				await this.pushService.send(user.fcmToken, options.title, options.body, {
					...(options.data || {}),
					...(options.entityType ? { entityType: options.entityType } : {}),
					...(options.entityId ? { entityId: String(options.entityId) } : {}),
				});
			} catch (e: any) {
				console.log(`notify: push failed for user ${user.id} - ${e.message}`);
			}
		}

		if (channels.whatsapp !== false && user.phone) {
			try {
				await this.whatsappService.sendMessage(user.phone, text);
			} catch (e: any) {
				console.log(`notify: whatsapp failed for user ${user.id} - ${e.message}`);
			}
		}

		if (channels.sms !== false && user.phone) {
			try {
				await this.smsService.sendSms(user.phone, text);
			} catch (e: any) {
				console.log(`notify: sms failed for user ${user.id} - ${e.message}`);
			}
		}

		if (channels.inApp !== false) {
			try {
				await this.notificationService.createNotification({
					title: options.title,
					message: options.body,
					type: options.type || 'system',
					userId: user.id,
					entityType: options.entityType,
					entityId: options.entityId,
				});
			} catch (e: any) {
				console.log(`notify: in-app notification failed for user ${user.id} - ${e.message}`);
			}
		}
	}

	/** Sends the same notification to several users, isolating failures per user. */
	async notifyMany(users: Array<User | null | undefined>, options: NotifyOptions): Promise<void> {
		for (const user of users) {
			await this.notify(user, options);
		}
	}

	/**
	 * WhatsApp + SMS to a bare phone number, for recipients that have no User record
	 * (or where an in-app notification makes no sense).
	 */
	async notifyPhone(phone: string, text: string): Promise<void> {
		if (!phone) {
			return;
		}
		try {
			await this.whatsappService.sendMessage(phone, text);
		} catch (e: any) {
			console.log(`notifyPhone: whatsapp failed for ${phone} - ${e.message}`);
		}
		try {
			await this.smsService.sendSms(phone, text);
		} catch (e: any) {
			console.log(`notifyPhone: sms failed for ${phone} - ${e.message}`);
		}
	}
}
