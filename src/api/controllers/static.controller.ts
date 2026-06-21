import {Request, Response} from 'express';
import {Container} from 'typedi';
import {ResHandlerService} from '../services/res-handler.service';
import {BadRequestError} from '../errors';
import getConfig from '../../config/env.config';
import {User} from "../models/user.model";
import {VirtualCardService} from "../services/virtual-card.service";
import ejs from 'ejs';
import path from 'path';
import * as cheerio from 'cheerio';

const resService = Container.get(ResHandlerService);
const virtualCardService = Container.get(VirtualCardService);
const config = getConfig();

// Helper function to extract body content from HTML using cheerio
const extractBodyContent = (html: string): string => {
	try {
		const $ = cheerio.load(html);
		const bodyContent = $('body').html() || '';
		return bodyContent.trim();
	} catch (e) {
		// Fallback to regex if cheerio fails
		const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
		if (bodyMatch && bodyMatch[1]) {
			return bodyMatch[1].trim();
		}
		// If no body tag found, return the whole HTML
		return html.trim();
	}
};

// Helper function to render EJS template and extract body content
const renderTemplate = async (templateName: string, data: any = {}): Promise<string> => {
	return new Promise((resolve, reject) => {
		// Use process.cwd() to get project root, works in both dev and production
		const templatePath = path.join(process.cwd(), 'views', 'pages', `${templateName}.ejs`);
		ejs.renderFile(templatePath, data, (err, html) => {
			if (err) {
				reject(err);
			} else {
				// Extract only the body content without HTML wrapper
				const content = extractBodyContent(html);
				resolve(content);
			}
		});
	});
};

export const getAbout = async (req: Request, res: Response) => {
	try {
		const content = await renderTemplate('about');
		return resService.handleSuccess(res, { content });
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const getTermsOfUse = async (req: Request, res: Response) => {
	try {
		const content = await renderTemplate('terms-of-use');
		return resService.handleSuccess(res, { content });
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const getPrivacyPolicy = async (req: Request, res: Response) => {
	try {
		const content = await renderTemplate('privacy');
		return resService.handleSuccess(res, { content });
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const getCookiesPolicy = async (req: Request, res: Response) => {
	try {
		const content = await renderTemplate('privacy');
		// Extract cookies section from privacy policy if needed
		// For now, returning full privacy policy which includes cookies section
		return resService.handleSuccess(res, { content });
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const getContactDetails = async (req: Request, res: Response) => {
	try {
		const data = {
			email: 'tal@any-app.com',
			phone: '0526474299',
			whatsapp: '0526474299'
		}
		return resService.handleSuccess(res, data);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};

export const getCustomerService = async (req: Request, res: Response) => {
	try {
		const content = await renderTemplate('customer-service');
		return resService.handleSuccess(res, { content });
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			'err',
			e
		));
	}
};
