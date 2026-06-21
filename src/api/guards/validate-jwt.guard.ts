import { NextFunction, Request, Response } from 'express';
import { cloneDeep } from 'lodash';
import { authenticate } from 'passport';
import passport from 'passport';
import { Container } from 'typedi';
import { UnauthorizedError } from '../errors/unauthorized.error';
import { ResHandlerService } from '../services/res-handler.service';
const resService = Container.get(ResHandlerService);
export const validateJwt = (req: Request, res: Response, next: NextFunction) => {


	return passport.authenticate('jwt', { session: false, failWithError: true }, (err, data, info) => {
		if (err) {
			return resService.handleError(res, new UnauthorizedError('general.error.authenticate_jwt', 'error authenticating jwt', err));
		}
		if (!data || !data?.user) {
			return resService.handleError(res, new UnauthorizedError('general.error.authenticate_jwt', 'error authenticating jwt', new Error('no data')));

		} else {
			const filteredUser = cloneDeep(data.user);
			req.user = filteredUser;
			//@ts-ignore
			req.isAuthenticated = () => true;
		}

		return next();
	})(req, res, next);
};
