import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { isEmpty } from 'lodash';
import { Container } from 'typedi';
import { Request, Response } from 'express';
import { ResHandlerService } from '../services/res-handler.service';
import { ClassConstructor } from 'class-transformer/types/interfaces';

const resHandlerService = Container.get(ResHandlerService);

export const validationMiddleware = <T>(clazz: ClassConstructor<T>) => {
	return async (req: Request, res: Response, next) => {
		const transformedObject = plainToClass(clazz, { ...req.body, ...req.params, ...req.query });
		const errors = await validate(transformedObject as Object);

		if (errors && !isEmpty(errors)) {
			resHandlerService.handleValidationErrors(res, errors);
		} else {
			next();
		}
	};
};
