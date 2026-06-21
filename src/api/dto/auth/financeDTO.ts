import {IsDate, IsNumber, IsNumberString, IsPhoneNumber, IsString, Length} from 'class-validator';
import {Type} from "class-transformer";

export class FinanceDTO {
	@IsString()
	socialID: string;
	@IsDate()
	@Type(() => Date)
	socialIDIssueDate: Date;
	@IsString()
	bankCode: string;
	@IsString()
	bankBranch: string;
	@IsString()
	bankAccountNumber: string;
	@IsString()
	bankAuthURL: string;
}
