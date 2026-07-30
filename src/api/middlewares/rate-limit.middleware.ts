import { Request, Response } from 'express';
import { Container } from 'typedi';
import { ResHandlerService } from '../services/res-handler.service';
import ExtendableError from '../errors/error.error';

const resHandlerService = Container.get(ResHandlerService);

const TOO_MANY_REQUESTS = 429;

interface Window {
	count: number;
	firstAt: number;
}

interface RateLimitOptions {
	windowMs: number;
	max: number;
	/** what to bucket by. falls back to the caller's ip when it returns nothing */
	keyFrom?: (req: Request) => string;
}

/**
 * Fixed window limiter kept in process memory. The api runs on a single web dyno, so a
 * shared store is unnecessary; if it is ever scaled out this has to move to the db or redis.
 */
export const rateLimitMiddleware = (options: RateLimitOptions) => {
	const windows = new Map<string, Window>();

	return (req: Request, res: Response, next) => {
		let key: string;
		try {
			key = (options.keyFrom && options.keyFrom(req)) || req.ip;
		} catch (e) {
			key = req.ip;
		}

		const now = Date.now();
		const current = windows.get(key);

		if (!current || now - current.firstAt > options.windowMs) {
			windows.set(key, { count: 1, firstAt: now });
		} else if (current.count >= options.max) {
			const retryAfter = Math.ceil((options.windowMs - (now - current.firstAt)) / 1000);
			res.set('Retry-After', String(retryAfter));
			return resHandlerService.handleError(res, new ExtendableError(
				'ERR_TOO_MANY_REQUESTS',
				`rate limit reached for ${key}`,
				new Error('rate limit reached'),
				TOO_MANY_REQUESTS
			));
		} else {
			current.count++;
		}

		// drop expired buckets so the map does not grow without bound on a long lived dyno
		if (windows.size > 5000) {
			windows.forEach((value, mapKey) => {
				if (now - value.firstAt > options.windowMs) {
					windows.delete(mapKey);
				}
			});
		}

		return next();
	};
};
