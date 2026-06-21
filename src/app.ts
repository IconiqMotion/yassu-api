import bodyParser from 'body-parser';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import nocache from 'nocache';
import 'reflect-metadata';
import APIRouter from './api/routes';
import bootstrapDb from './config/db.config';
import getConfig from './config/env.config';
import { initJWT } from './config/jwt.config';
import Logger from './config/logger.config';
import path from 'path';
import { Container } from "typedi";
import { PaymentService } from "./api/services/payment.service";
import { Event } from "./api/models/event.model";
import { PushService } from "./api/services/push.service";
const paymentService = Container.get(PaymentService);

// Load configurations
const config = getConfig();

Logger.info('Starting server...');
Logger.info(`Env: ${config.name}`);

// Create Express server
const app = express();

// set the view engine to ejs
app.set('view engine', 'ejs');

app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

app.get('/tokenize', function (req, res) {
	res.render('pages/tokenize', { serverUrl: getConfig().serverUrl });
});

app.get('/thanks', function (req, res) {
	res.render('pages/thanks');
});

app.get('/privacy', function (req, res) {
	res.render('pages/privacy');
});

app.get('/about', function (req, res) {
	res.render('pages/about');
});

// Function to validate JSON
const validateJSON = (buf) => {
	try {
		return JSON.parse(buf); // If valid, return parsed JSON
	} catch (e) {
		throw new SyntaxError('Invalid JSON'); // Throw error for invalid JSON
	}
};

// Function to log errors to a file or console
const logError = (req, err) => {
	const logMessage = `
      Error: Invalid JSON
      Route: ${req.originalUrl}
      Method: ${req.method}
      Body: ${err.body}
      Time: ${new Date().toISOString()}
    `;
	console.error(logMessage);

};

// Express configuration
app.use(helmet({
	frameguard: false, contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'", '*'],
			frameAncestors: ["*"],
			scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", '*'],
			styleSrc: ["'self'", "'unsafe-inline'", '*'],
		},
	},
}));
app.use(morgan('dev'));
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : '*' }));
app.use(nocache());
app.use((req, res, next) => {
	bodyParser.json({
		strict: true,
		verify: (req, res, buf, encoding) => {
			try {
				validateJSON(buf); // Validate JSON through a pure function
			} catch (e) {
				e.status = 400;
				logError(req, e); // Log the problematic route and body
				throw e;
			}
		},
	})(req, res, next);
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(APIRouter);

async function init() {
	let db = await bootstrapDb();
	initJWT();
	if (db) {
		Logger.info('DB is connected');
	} else {
		Logger.error('Cannot connect to db. this could be fatal');
	}

	app.listen(process.env.PORT || config.port || 8080, () => Logger.info(`Server listening on port ${process.env.PORT || config.port || 8080}. Enjoy!`));
}

init();

export default app;
