import {Request, Response} from 'express';
import {Container} from 'typedi';
import {ResHandlerService} from '../services/res-handler.service';
import {BadRequestError} from '../errors';
import getConfig from '../../config/env.config';
import {User} from "../models/user.model";
import {VirtualCardService} from "../services/virtual-card.service";
import {EventService} from "../services/event.service";

const resService = Container.get(ResHandlerService);
const eventService = Container.get(EventService);
const config = getConfig();

export const getHomePageData = async (req: Request, res: Response) => {
	try {
		const user = req.user as User;
		const data = await eventService.getHomePageData(user);
		return resService.handleSuccess(res, data);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};
