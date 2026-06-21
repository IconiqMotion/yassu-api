import {IsNumber, IsNumberString, IsObject, IsOptional, IsString} from 'class-validator';
import {Type} from "class-transformer";

export class AddCreditCardDTO {
	@IsOptional()
	@Type(() => Number)
	reqId: string;

	@IsOptional()
	@IsString()
	payerName: string;

	@IsOptional()
	@IsString()
	payerSocialId: string;

	@IsOptional()
	@IsString()
	token: string;

	@IsOptional()
	card: {
		cardholderName: string;
		cardMask: string;
		expiry: string;
	};

}
