import {IsNumberString, IsPhoneNumber, IsString, Length} from 'class-validator';

export class VerifyDTO {
	@IsString()
	phone: string;

	@IsNumberString()
	@Length(6, 6)
	verificationCode: string;
}
