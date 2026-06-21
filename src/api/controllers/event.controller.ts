import { plainToInstance } from 'class-transformer';

import { Request, Response } from 'express';
import { Container } from 'typedi';
import { ResHandlerService } from '../services/res-handler.service';
import { BadRequestError } from '../errors';
import { SmsService } from '../services/sms.service';
import { AuthService } from '../services/auth.service';
import getConfig from '../../config/env.config';
import { RegisterDTO } from '../dto/auth/registerDTO';
import { UsersService } from "../services/users.service";
import {SendGiftDTO, WithdrawMoneyDTO} from "../dto/sendGiftDTO";
import { GiftService } from "../services/gift.service";
import { User } from "../models/user.model";
import { EventService } from "../services/event.service";

const resService = Container.get(ResHandlerService);
const eventService = Container.get(EventService);
const config = getConfig();

/**
 * @api {post} /api/v1/virtual-card/send-gift Send Gift
 * @apiName SendGift
 * @apiGroup VirtualCard
 * @apiVersion 1.0.0
 * @apiDescription Send a gift to a friend
 */
export const getMyEvents = async (req: Request, res: Response) => {
	try {
		const created = await eventService.getMyEvents((req.user as User));
		return resService.handleSuccess(res, created);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const getEventById = async (req: Request, res: Response) => {
	try {
		const event = await eventService.findOneWithGreetingAndUsers(parseInt(req.params.id));

		return resService.handleSuccess(res, event || null);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
}

/**
 * Get encoded hash for event ID
 * Used by client to generate shareable links
 */
export const getEventHash = async (req: Request, res: Response) => {
	try {
		const eventId = req.params.id;
		const user = req.user as User;
		
		// Verify user has access to this event
		const event = await eventService.getEventById(+eventId, user);
		if (!event) {
			return resService.handleError(res, new BadRequestError('event.not_found', 'Event not found'));
		}
		
		const hash = eventService.getEventHash(+eventId);
		const shareableLink = `https://yassuapp.com/${hash}`;
		
		return resService.handleSuccess(res, {
			eventId: +eventId, 
			hash: hash,
			shareableLink: shareableLink
		});
	} catch (e) {
		return resService.handleError(res, new BadRequestError('general.error', 'err', e));
	}
}

/**
 * Public endpoint to get event data by encoded hash
 * No authentication required
 */
export const getEventByHash = async (req: Request, res: Response) => {
	try {
		const eventHash = req.params.hash; // e.g. "E73387"
		
		if (!eventHash) {
			return resService.handleError(res, new BadRequestError('event.invalid_hash', 'Event hash is required'));
		}

		const event = await eventService.getEventByHash(eventHash);
		
		if (!event) {
			return resService.handleError(res, new BadRequestError('event.not_found', 'Event not found'));
		}

		return resService.handleSuccess(res, event);
	} catch (e) {
		return resService.handleError(res, new BadRequestError('general.error', 'err', e));
	}
}

export const withdrawRequest = async (req: Request, res: Response) => {
	try {
		const eventId = +req.params.id;
		const transformed = plainToInstance(WithdrawMoneyDTO, req.body) as WithdrawMoneyDTO;
		const event = await eventService.withdrawRequest((req.user as User), eventId, transformed);
		return resService.handleSuccess(res, event);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
}

export const create = async (req: Request, res: Response) => {
	try {
		const transformed = plainToInstance(SendGiftDTO, req.body) as SendGiftDTO;
		const created = await eventService.create(transformed, (req.user as User));
		return resService.handleSuccess(res, created);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};
export const notifyThanks = async (req: Request, res: Response) => {
	try {
		const eventId = req.params.id;
		const created = await eventService.notifyThanks((req.user as User), eventId);
		return resService.handleSuccess(res, created);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};
export const handleTodays = async (req: Request, res: Response) => {
	try {
		const created = await eventService.handleTodaysEvents();
		await eventService.handleTodaysGroups();
		return resService.handleSuccess(res, created);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const handleDaily = async (req: Request, res: Response) => {
	try {
		await eventService.handleDaily();
		return resService.handleSuccess(res, {});
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};
