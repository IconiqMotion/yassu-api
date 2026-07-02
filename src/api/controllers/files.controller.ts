import { Request, Response } from 'express';
import { BadRequestError } from '../errors';
import { Container } from 'typedi';
import { FileUploaderService } from '../services/file-uploader.service';
import { ResHandlerService } from '../services/res-handler.service';

const fileService = Container.get(FileUploaderService);
const resService = Container.get(ResHandlerService);

export const uploadFiles = async (req: Request, res: Response) => {
	try {
		if (!req.file || req.file.fieldname !== 'fileToUpload') {
			throw new Error('No file received under the "fileToUpload" field');
		}
		const file = req.file;
		const uploadedFile = await fileService.uploadBuffer(file.buffer, file.originalname, file.originalname);

		return resService.handleSuccess(res, uploadedFile.Location);
	} catch (e) {
		return resService.handleError(res, new BadRequestError(
			'general.error',
			`Failed to upload file: ${e?.message}`,
			e
		));
	}
};
