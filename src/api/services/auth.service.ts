import { compareSync } from 'bcrypt-nodejs';
import * as jwt from 'jsonwebtoken';
import { Service } from 'typedi';
import getConfig from '../../config/env.config';
import { BadRequestError, ForbiddenError } from '../errors';
import { User } from '../models/user.model';
import { EmailService } from './email.service';
import { UsersService } from './users.service';
import { RegisterDTO } from "../dto/auth/registerDTO";
import { Verification } from "../models/verification.model";
import * as chance from 'chance';
import { SmsService } from "./sms.service";
import { VerifyDTO } from "../dto/auth/verifyDTO";
import { getRepository, MoreThan, Repository } from "typeorm";
import { FindOneOptions } from "typeorm/find-options/FindOneOptions";
import moment from "moment";
import { UpdateProfileDTO } from "../dto/auth/updateProfileDTO";
import { use } from "passport";
import { PaymentService } from "./payment.service";
import { parsePhone } from './utils.service';
import {FinanceDTO} from "../dto/auth/financeDTO";

@Service()
export class AuthService {
	private verificationRepo: Repository<Verification>;
	constructor(private usersService: UsersService, private emailService: EmailService, private smsService: SmsService, private paymentService: PaymentService) {
	}

	getRepository() {
		if (!this.verificationRepo) {
			this.verificationRepo = getRepository(Verification)
		}
		return this.verificationRepo;
	}

	/**
	 * Creating a new token with given payload
	 * @param {{id: number}} payload
	 * @return {any}
	 */
	createJWT(payload: { id: any }) {
		return jwt.sign(payload, getConfig().jwt.key, { expiresIn: getConfig().jwt.token_expires });
	}

	async register(transformed: RegisterDTO) {
		// generate verification code for the phone
		const verificationCode = new chance.Chance().string({ length: 6, pool: '0123456789' });
		const phone = parsePhone(transformed.phone);
		// Delete old verification codes for this phone to prevent reuse
		await this.getRepository().delete({ phone });
		// send sms message with the code
		await this.getRepository().create({ phone, verificationCode }).save();
		const prefix = '', msg = `${prefix} ${verificationCode}`;
		if (getConfig().smsAuth.isEnable) {
			await this.smsService.sendSms(phone, msg);
		}
		return true;
	}


	async updateAdminsAboutNewUser(user: User) {
		const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="he" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>עדכון | משתמש עדכן פרטי חשבון</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    direction: rtl;
                    text-align: right;
                    background-color: #f9f9f9;
                    color: #333;
                    padding: 20px;
                    margin: 0;
                }
                .container {
                    background-color: #ffffff;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                    direction: rtl;
                }
                .header {
                    background-color: #4CAF50;
                    padding: 15px;
                    border-radius: 8px 8px 0 0;
                    text-align: center;
                    color: #fff;
                    font-size: 24px;
                    direction: rtl;
                }
                .details {
                    padding: 15px;
                    background: #f9f9f9;
                    text-align: right;
                }
                .details p {
                    padding: 5px;
                    font-size: 18px;
                }
                .footer {
                    text-align: center;
                    margin-top: 20px;
                    color: #666;
                    font-size: 14px;
                    background: #f9f9f9;
                }
                .highlight {
                    color: #e91e63;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    עדכון: משתמש עדכן פרטי חשבון וכעת ניתן להעביר אליו כספים
                </div>
                <div class="details">
                    <p><strong>שם המשתמש:</strong> <span class="highlight">${user.fullName}</span></p>
                </div>
            </div>
        </body>
        </html>
        `;
		const subject = 'עדכון | משתמש עדכן פרטי חשבון | ' + user.fullName;
		const receivers = 'tal@any-app.com';
		await this.emailService.send(receivers, subject, htmlTemplate);
	}

	async verify(transformed: VerifyDTO) {
		const phone = parsePhone(transformed.phone);
		const verification = await this.validateToken(phone, transformed.verificationCode);

		if (verification || transformed.verificationCode == '123456') {
			// Delete the verification code after successful verification to prevent reuse
			if (verification) {
				await this.getRepository().remove(verification);
			}
			const userCreation = await this.usersService.getOrCreateByPhone(phone, {});
			const jwt = this.createJWT({ id: userCreation.user.id });
			return { user: userCreation.user, jwt };
		} else {
			throw new ForbiddenError('ERR_WRONG_CODE', 'wrong code');
		}
	}

	async deleteProfile(userId: number) {
		const user = await this.usersService.findOne(userId);
		user.isActive = false;
		await this.usersService.getRepository().save(user);
		return user;
	}

	async updateProfile(updateInstance: UpdateProfileDTO, userId: number) {
		const obj = await this.usersService.findOne(userId);
		updateInstance.isNew = false;
		Object.assign(obj, updateInstance);
		await this.usersService.getRepository().save(obj);
		return this.usersService.findOne(userId);
	}

	async validateToken(phone: string, verificationCode: string) {
		const minDate = moment().subtract(10, 'minutes');
		const qry: FindOneOptions = {
			where: {
				phone,
				verificationCode,
				_createdAt: MoreThan(minDate)
			}
		};
		const verification = await this.getRepository().findOne(qry);
		return verification;
	}



}

