/** @format */

import winston from 'winston';
const { combine, timestamp, printf, colorize, align } = winston.format;

const logger = winston.createLogger({
	levels: winston.config.syslog.levels,
	level:
		process.argv.findIndex((val) => val == '--dev') != -1 ? 'debug' : 'info',
	format: combine(
		colorize({ all: true }),
		timestamp({
			format: 'YYYY-MM-DD hh:mm:ss.SSS A',
		}),
		align(),
		printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`),
	),
	exceptionHandlers: [
		new winston.transports.File({ filename: 'logs/exception.log' }),
	],
	rejectionHandlers: [
		new winston.transports.File({ filename: 'logs/rejections.log' }),
	],
	transports: [new winston.transports.Console()],
});

export default logger;
