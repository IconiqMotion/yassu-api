import { Service } from 'typedi';
import {DeepPartial, SelectQueryBuilder} from 'typeorm';
import { BadRequestError } from '../errors';
import { Request } from 'express';
import {GetAllDTO} from "../dto/getAllDTO";
import getConfig from "../../config/env.config";
import { Pagination } from '../interfaces/pagination.interface';

@Service()
export class UtilsService {
	constructor() {
	}

	/**
	 * Return new object from given one with only picked fields
	 * @param obj
	 * @param fields
	 */
	pickFieldsFromArray<T>(obj: any, fields: string[]): Promise<Partial<T>> {
		return new Promise((resolve, reject) => {
			if (typeof (obj) !== 'object') {
				return reject(new Error('bad type'));
			}

			return resolve(
				fields.reduce((total: any, current: any) => {
					if (current in obj) total[current] = obj[current];
					return total;
				}, {})
			);

		});
	}

	filterArray<T>(obj: any, arrayFields: string[]): Array<T> {
		return obj.map(val => {
			return Object.keys(val)
				.filter(key => arrayFields.includes(key))
				.filter(key => val[key] !== '')
				.reduce((obj, key) => {
					obj[key] = val[key];
					return obj;
				}, {});
		});
	}

	trimStringsFromObj(obj) {
		return Object.keys(obj).map(k => obj[k] = typeof obj[k] === 'string' ? obj[k].trim() : obj[k]);
	}

	strToBool(str) {
		if (typeof str === 'boolean')
			return str;
		else return (str == 'true');
	}

	/**
	 * Check missing fields in object
	 * @param obj
	 * @param fields
	 */
	checkMissingFields(obj: any, fields: string[]): Promise<string[]> {
		return new Promise((resolve, reject) => {
			let missingFields: string[] = fields.filter(field => !(field in obj));
			return resolve(missingFields);
		});
	}

	/**
	 * @description Handle missing fields in object scenario
	 * @template T The type for obj
	 * @param {DeepPartial<T>} obj the object to check
	 * @param {(Array<keyof T & string>)} required fields in obj
	 * @param {string} controllerNamespace
	 * @param {string} endPoint
	 * @memberof UtilsService
	 * @author Natan Farkash
	 */
	async handleMissingFields<T>(obj: DeepPartial<T>, required: Array<keyof T & string>, controllerNamespace: string, endPoint: string) {
		const missingFields = await this.checkMissingFields(obj, required);
		if (missingFields.length) throw new BadRequestError(`${controllerNamespace}.error.${endPoint}`, missingFields.join(', ') + ' are mandatory', new Error('missing params'));

	}

	parseQueryString(query: { [key: string]: string }) {
		const result: { [key: string]: any } = {};
		for (const [key, value] of Object.entries(query)) {
			switch (value) {
				case false.toString(): {
					result[key] = false;
					break;
				}
				case true.toString(): {
					result[key] = true;
					break;
				}
				default: {
					result[key] = value && isFinite(value as any) ? +value : value;
				}
			}
		}
		return result;
	}

}

export const getFixedValue = (num: number, precision = 0.2) => {
	return +num.toFixed(precision);
};

/**
 * return if it is legal israeli phone number
 *
 * @param phone - phone number to check
 * @returns {boolean}
 */
export const isValidPhone = (phone: string) => {
	return /^\+?(972|0)?(\-)?([5]{1}\d{8})$/.test(phone);
};

export function DateTransform(value) {
	if (!value) return null;
	return new Date(value);
}

/**
 * format phone numbers
 *
 * gets a phone number according to the /^\+?(972|0)?(\-)?([5]{1}\d{8})$/ regex
 * return number started with 972
 * @param phone
 * @returns {*}
 */
export const parsePhone = (phone) => {
	// Remove all non-digit characters
	let parsedPhone = phone.replace(/\D/g, '');

	// If it starts with '9720', replace '9720' with '972'
	parsedPhone = parsedPhone.replace(/^9720/, '972');

	// If it doesn't start with '972', handle leading zero
	if (!parsedPhone.startsWith('972')) {
		parsedPhone = parsedPhone.replace(/^0/, ''); // Remove leading zero if present
		parsedPhone = '972' + parsedPhone; // Prepend '972'
	}

	return parsedPhone;
};

export const unparsePhone = (phone) => {
	let unparsedPhone = phone;
	if (unparsedPhone.startsWith('972')) {
		unparsedPhone = unparsedPhone.substring(3);
	}

	if (!unparsedPhone.startsWith('0')) {
		unparsedPhone = `0${unparsedPhone}`;
	}

	return unparsedPhone;
};

export const reqToParams = (req: Request) => {
	return {...req.params, ...req.query, ...req.body};
};

export const parseFilterQuery = (dto: GetAllDTO) => {
	dto.limit = dto.limit || getConfig().limit;
	dto.page = dto.page || getConfig().page;
}

export const applyPagination = async <T>(queryBuilder: SelectQueryBuilder<T>, page = 1, limit = 20): Promise<Pagination<T>> => {
	const results = await queryBuilder.skip((page - 1) * limit)
		.take(limit)
		.getManyAndCount();

	return { entities: results[0], total: results[1] };
};

export const stringToBoolean = (s: string) => {
	if (s.toLowerCase() === 'true' || s.toLowerCase() === 'yes' || s === 'כן') {
		return true;
	} else if (s.toLowerCase() === 'false' || s.toLowerCase() === 'no' || s === 'לא') {
		return false;
	} else {
		return s;
	}
};
