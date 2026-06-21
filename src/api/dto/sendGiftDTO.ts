import {IsBoolean, IsNumber, IsOptional, IsPhoneNumber, IsString, Max} from 'class-validator';

export class SendGiftDTO {

	@IsPhoneNumber()
	receiverPhoneNumber: string;

	@IsNumber()
	@Max(12)
	eventMonth: number;

	@IsNumber()
	@Max(31)
	eventDay: number;

	@IsNumber()
	@Max(2030)
	eventYear: number;

	@IsOptional()
	@IsString()
	greetingText: string;

	@IsOptional()
	@IsString()
	receiverName: string;

	@IsOptional()
	@IsString()
	imageURL: string;

	@IsOptional()
	@IsString()
	videoURL: string;

	@IsOptional()
	@IsNumber()
	totalGiftSum: number;

	@IsOptional()
	@IsNumber()
	cardID: number;

}

export class SendGroupGiftDTO {

	@IsOptional()
	@IsString()
	greetingText: string;

	@IsOptional()
	@IsString()
	imageURL: string;

	@IsOptional()
	@IsString()
	videoURL: string;

	@IsOptional()
	@IsNumber()
	totalGiftSum: number;

	@IsOptional()
	@IsNumber()
	cardID: number;

	@IsNumber()
	groupID: number;
}



export class CreateGreetingDTO {
	@IsOptional()
	@IsString()
	greetingText: string;

	@IsOptional()
	@IsString()
	imageURL: string;

	@IsOptional()
	@IsString()
	videoURL: string;

	@IsOptional()
	@IsNumber()
	totalGiftSum: number;

	@IsOptional()
	@IsNumber()
	cardID: number;
}

export class WithdrawMoneyDTO {
	// Option 1: Use existing saved bank account
	@IsOptional()
	@IsNumber()
	bankAccountId?: number;

	// Option 2: Provide new bank account details
	@IsOptional()
	@IsString()
	withdrawType?: string; // BANK, BIT

	@IsOptional()
	@IsString()
	bitPhoneNumber?: string;

	@IsOptional()
	@IsString()
	bank?: string;

	@IsOptional()
	@IsString()
	branch?: string;

	@IsOptional()
	@IsString()
	accountNumber?: string;

	@IsOptional()
	@IsString()
	accountHolderName?: string;

	@IsOptional()
	@IsString()
	accountNationalId?: string;

	// If true, save the new bank account details for future use
	@IsOptional()
	@IsBoolean()
	saveForFuture?: boolean;
}
