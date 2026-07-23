import * as awsSdk from 'aws-sdk';
import { S3 } from 'aws-sdk';
import { createHash } from 'crypto';
import del from 'del';
import { readFile } from 'fs';
import moment from 'moment';
import { extname } from 'path';
import { Service } from 'typedi';
import { promisify } from 'util';
import getConfig from '../../config/env.config';

@Service()
export class FileUploaderService {

	private s3;

	constructor(props) {
		const auth = getConfig().awsAuth;
		awsSdk.config.credentials = auth;
		if (getConfig().awsRegion) awsSdk.config.region = getConfig().awsRegion;

		this.s3 = new awsSdk.S3();
	}

	private cleanFile(filePath: string) {
		return del([filePath]);
	}

	private async uploadS3(filePath: string, originalName: string, extensions?: Array<any>) {
		this.checkExtension(filePath, originalName, extensions);
		const Body = await promisify(readFile)(filePath);
		return await this.uploadBuffer(Body, originalName, filePath);
	}

	uploadBuffer(Body, name: string, filePath?: string) {
		return new Promise<S3.ManagedUpload.SendData>((resolve, reject) => {
			this.s3.upload(
				{
					Body,
					Bucket: getConfig().bucketName,
					Key: `${moment().format('YYYY-MM-DD')}/${createHash('sha1').update(Date.now().toString()).digest('hex')}/${createHash('md5').update(name).digest('hex')}/${name}`,
					//ACL: 'public-read'
				},
				async (error, data) => {
					if (error) reject(error);
					if (filePath) await this.cleanFile(filePath);
					resolve(data);
				}
			);
		});
	}

	uploadImage({ filename, originalname }: Express.Multer.File) {
		return this.uploadS3(getConfig().uploadDir + filename, originalname, ['.jpg', '.jpeg', '.png']);
	}

	checkExtension(filePath: string, originalName: string, extensions: Array<string>) {

		if (!extensions) return;

		if (!filePath) throw new Error(
			'general.error.no_file',
			// 'filePath: ' + filePath
		);

		if (!extensions.includes(extname(originalName).toLocaleLowerCase())) throw new Error(
			'general.error.file_ext',
			// 'extension is not allowed: ' + originalName
		);
	}
}

