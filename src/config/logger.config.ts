import * as path from 'path';
import { createLogger, format, transports } from 'winston';
import getConfig from './env.config';

const { combine, timestamp, printf } = format;

const customFormat = printf(info => {
	return `${info.timestamp} ${info.level}: ${info.message}`;
});

let logzioWinstonTransport;

if (getConfig().logzio.host != '' && getConfig().logzio.host) {
	// logzioWinstonTransport = new LogzioWinstonTransport({
	// 	level: 'info',
	// 	name: 'winston_logzio',
	// 	token: getConfig().logzio.token,
	// 	host: getConfig().logzio.host,
	// });

}

const Logger = createLogger({
	level: 'info',
	format: combine(
		timestamp(),
		customFormat
	),
	transports: ([
		new transports.Console({
			level: 'debug',
			format: combine(
				format.colorize(),
				customFormat,
			)
		})
	])
});

export default Logger;
