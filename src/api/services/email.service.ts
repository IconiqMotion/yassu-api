import { createTransport } from 'nodemailer';
import getConfig from '../../config/env.config';
import Logger from '../../config/logger.config';
import sgMail from '@sendgrid/mail';
import { Service } from 'typedi';

const sgTransport = require('nodemailer-sendgrid-transport');

@Service()
export class EmailService {
	private transporter: any;

	constructor() {
		const options = {
			auth: {
				api_key: getConfig().mailAuth?.sendGridKey
			}
		};

		const sgKey = getConfig().mailAuth?.sendGridKey;
		if (sgKey && sgKey.startsWith('SG.')) {
			sgMail.setApiKey(sgKey);
			this.transporter = createTransport(sgTransport(options));
		}
	}

	async send(to: string, subject: string, template: string) {
		const mailOptions = {
			from: getConfig().mailAuth.from,
			to,
			subject,
			html: template
		};

		return this.transporter.sendMail(mailOptions, (err: Error, info: any) => {
			if (err) {
				Logger.error('Error sending email');
				console.log(err);
			} else {
				Logger.info('Sent mail');
				console.log(info);
			}
		});
	}
}
