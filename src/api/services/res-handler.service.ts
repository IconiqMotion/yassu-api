import { Response } from 'express';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR, OK } from 'http-status-codes';
import { Service } from 'typedi';
import { isEmpty } from 'lodash';

import ExtendableError from '../errors/error.error';
import {ValidationError} from 'class-validator';
import Logger from '../../config/logger.config';
import {ClassConstructor} from "class-transformer/types/interfaces";
import {plainToClass, plainToInstance} from "class-transformer";

@Service()
export class ResHandlerService {
	constructor() {
	}

	handleError(res: Response, error: ExtendableError, status = INTERNAL_SERVER_ERROR) {
		Logger.error('Failed request with: ', res);
		// @ts-ignore
		error.errInUse = error?.code?.includes('ROW_IS_REFERENCED');
		return res.status(error?.httpStatus ? error.httpStatus : status).json({
			errorMsgCode: error.errorMsgCode,
			logMessage: error.logMessage,
			error: error.error,
			httpStatus: error.httpStatus,
			costumeError: error.costumeError,
			success: false,
		});

	}

	/**
	 * handle success response
	 * send data, success and new token TODO: add create token
	 * @param res
	 * @param data
	 * @param status
	 */
	handleSuccess<T>(res: Response, data: any) {
		const status = OK;
		return res.status(status).json({
			data,
			success: true
		});
	}

	/**
	 * handle file response
	 * send data, success and new token TODO: add create token
	 * @param res
	 * @param data
	 * @param status
	 */
	handleFile(res: Response, data: any, status = OK) {
		return res.status(status).type('application/pdf').attachment().end(data);
	}

	handleValidationErrors(res: Response, errors: ValidationError[]) {
		console.error(errors);

		return res.status(BAD_REQUEST).json({
			success: false,
			errors: errors.map((err: ValidationError) => {
				return {
					property: err.property,
					constraints: err.constraints
				};
			})
		});
	}
}


