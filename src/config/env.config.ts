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
	awsRegion?: string;
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
		sms4freeKey: string;
		sms4freeUser: string;
		sms4freePass: string;
	};
	logzio: {
		token: string;
		host: string;
	}
}

let config: any;
const init = () => {
	let envPath = path.join(path.dirname(__dirname), 'env');
	const requireIfExists = (file: string) => {
		try {
			return require(path.join(envPath, file));
		} catch (e) {
			return {};
		}
	};
	switch (argv.env) {
		case 'prod':
		case 'production':
			config = requireIfExists('prod.json');
			break;
		case 'dev':
		case 'develop':
			config = requireIfExists('dev.json');
			break;
		default:
			config = requireIfExists('dev.json');
			break;
	}

	// Heroku has no filesystem persistence across deploys, so src/env/*.json (gitignored) won't
	// exist there. CONFIG_JSON lets the whole file be supplied as one config var instead.
	if (process.env.CONFIG_JSON) {
		Object.assign(config, JSON.parse(process.env.CONFIG_JSON));
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
	// Heroku Postgres only exposes a single DATABASE_URL; parse it into the discrete fields this app expects.
	if (process.env.DATABASE_URL) {
		const dbUrl = new URL(process.env.DATABASE_URL);
		config.dbHost = dbUrl.hostname;
		config.dbPort = parseInt(dbUrl.port, 10) || 5432;
		config.dbUser = decodeURIComponent(dbUrl.username);
		config.dbPass = decodeURIComponent(dbUrl.password);
		config.dbName = dbUrl.pathname.replace(/^\//, '');
	}
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
	if (process.env.AWS_REGION) config.awsRegion = process.env.AWS_REGION;

	// Bucketeer (Heroku add-on, S3-compatible) — takes priority since it's what Heroku actually provisions
	if (process.env.BUCKETEER_AWS_ACCESS_KEY_ID) {
		config.awsAuth = {
			accessKeyId: process.env.BUCKETEER_AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.BUCKETEER_AWS_SECRET_ACCESS_KEY,
		};
		config.bucketName = process.env.BUCKETEER_BUCKET_NAME;
		config.awsRegion = process.env.BUCKETEER_AWS_REGION;
	}

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

	// sms4free
	if (process.env.SMS4FREE_KEY) (config.smsAuth = config.smsAuth || {}).sms4freeKey = process.env.SMS4FREE_KEY;
	if (process.env.SMS4FREE_USER) (config.smsAuth = config.smsAuth || {}).sms4freeUser = process.env.SMS4FREE_USER;
	if (process.env.SMS4FREE_PASS) (config.smsAuth = config.smsAuth || {}).sms4freePass = process.env.SMS4FREE_PASS;
	if (process.env.SMS4FREE_SENDER) (config.smsAuth = config.smsAuth || {}).senderName = process.env.SMS4FREE_SENDER;

	return Object.assign(config, constants);
};

const getConfig = (): IConfig => {
	return config || init(); //  "exec": "set TS_NODE_TRANSPILE_ONLY=true&ts-node -r tsconfig-paths/register src/app.ts",
};

export default getConfig;
