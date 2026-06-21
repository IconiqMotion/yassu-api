import minimist, { ParsedArgs } from 'minimist';
import * as path from 'path';

const argv: ParsedArgs = minimist(process.argv.slice(2));

if (!process.env.JWT_SIGNING_KEY) {
	throw new Error('JWT_SIGNING_KEY environment variable is required');
}

const constants = {
	// here should put app constants
	jwt: {
		token_expires: '365 days',
		key: process.env.JWT_SIGNING_KEY,
		ignoreExpiration: false
	},
	uploadDir: 'uploads/',
	page: 1,
	limit: 20,
};

export interface IConfig {
	name: string;
	production: boolean;
	logLevel: string;
	serverUrl: string;
	port: number;
	page: number;
	fee: number;
	limit: number;
	dbHost: string;
	dbPort: number;
	dbUser: string;
	dbPass: string;
	dbName: string;
	uploadDir: string;
	bucketName: string;
	awsAuth: {
		accessKeyId: string;
		secretAccessKey: string;
	};
	synchronize: boolean;
	logging: boolean;
	dropSchema: boolean;
	jwt: {
		token_expires: string;
		key: string;
		ignoreExpiration: boolean;
	},
	mailAuth: {
		username?: string;
		password?: string;
		sendGridKey?: string;
		from?: string;
	},
	sms: {
		senderName: string;
	},
	payLolly: {
		baseURL: string;
		reseller_id: number;
		processor_id: number;
		public_key: string;
		private_key: string;
	},
	payMe: {
		baseURL: string;
		clientKey: string;
		seller_id: string;
		clientSecret: string;
		reseller_id: number;
		processor_id: number;
		public_key: string;
		private_key: string;
	},
	cardCom: {
		baseURL: string;
		apiName: string;
		terminalId: string;
		TerminalPass: string;
		environment?: 'sandbox' | 'production';
		isDev?: boolean;
	},
	greenApi: {
		instanceId: string;
		token: string;
	},
	smsAuth: {
		key: string;
		senderName: string;
		isEnable: boolean;
		inforukey: string;
		inforutoken: string;
		token: string;
		endpoint: string;
	};
	logzio: {
		token: string;
		host: string;
	}
}

let config: any;
const init = () => {
	let envPath = path.join(path.dirname(__dirname), 'env');
	switch (argv.env) {
		case 'prod':
		case 'production':
			config = require(path.join(envPath, 'prod.json'));
			break;
		case 'dev':
		case 'develop':
			config = require(path.join(envPath, 'dev.json'));
			break;
		default:
			config = require(path.join(envPath, 'dev.json'));
			break;
	}

	// Override cardCom config from environment variables if present
	if (process.env.CARDCOM_API_NAME || process.env.CARDCOM_TERMINAL_NUMBER) {
		config.cardCom = {
			baseURL: process.env.CARDCOM_API_URL || config.cardCom?.baseURL || 'https://secure.cardcom.solutions/api/v11',
			apiName: process.env.CARDCOM_API_NAME || config.cardCom?.apiName,
			terminalId: process.env.CARDCOM_TERMINAL_NUMBER || config.cardCom?.terminalId,
			TerminalPass: process.env.CARDCOM_API_PASSWORD || config.cardCom?.TerminalPass,
			environment: process.env.CARDCOM_ENVIRONMENT || config.cardCom?.environment || 'production',
			isDev: process.env.CARDCOM_IS_DEV === 'true' || config.cardCom?.isDev || false,
		};
	}

	// Database — env vars override prod.json so secrets stay out of source
	if (process.env.DB_HOST) config.dbHost = process.env.DB_HOST;
	if (process.env.DB_PORT) config.dbPort = parseInt(process.env.DB_PORT, 10);
	if (process.env.DB_USER) config.dbUser = process.env.DB_USER;
	if (process.env.DB_PASSWORD) config.dbPass = process.env.DB_PASSWORD;
	if (process.env.DB_NAME) config.dbName = process.env.DB_NAME;
	if (process.env.DB_SYNCHRONIZE === 'true') config.synchronize = true;

	// AWS / S3
	if (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_SECRET_ACCESS_KEY) {
		config.awsAuth = {
			accessKeyId: process.env.AWS_ACCESS_KEY_ID || config.awsAuth?.accessKeyId,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || config.awsAuth?.secretAccessKey,
		};
	}
	if (process.env.S3_BUCKET) config.bucketName = process.env.S3_BUCKET;

	// SendGrid
	if (process.env.SENDGRID_KEY) {
		config.mailAuth = config.mailAuth || {};
		config.mailAuth.sendGridKey = process.env.SENDGRID_KEY;
	}
	if (process.env.MAIL_FROM) {
		config.mailAuth = config.mailAuth || {};
		config.mailAuth.from = process.env.MAIL_FROM;
	}

	// Logzio
	if (process.env.LOGZIO_TOKEN || process.env.LOGZIO_HOST) {
		config.logzio = {
			token: process.env.LOGZIO_TOKEN || config.logzio?.token,
			host: process.env.LOGZIO_HOST || config.logzio?.host,
		};
	}

	// SMS (smsAuth)
	if (process.env.SMS_KEY) (config.smsAuth = config.smsAuth || {}).key = process.env.SMS_KEY;
	if (process.env.SMS_TOKEN) (config.smsAuth = config.smsAuth || {}).token = process.env.SMS_TOKEN;

	return Object.assign(config, constants);
};

const getConfig = (): IConfig => {
	return config || init(); //  "exec": "set TS_NODE_TRANSPILE_ONLY=true&ts-node -r tsconfig-paths/register src/app.ts",
};

export default getConfig;
