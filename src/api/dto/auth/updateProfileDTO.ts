import {IsDate, IsEnum, IsNumber, IsOptional, IsString} from 'class-validator';
import {Type} from "class-transformer";
import {EGender} from "../../models/enums";

export class UpdateProfileDTO {
	@IsOptional()
	@IsString()
	profileImage: string;
	@IsOptional()
	@IsString()
	email: string;
	@IsOptional()
	@IsString()
	fcmToken: string;
	@IsOptional()
	@IsString()
	firstName: string;
	@IsOptional()
	@IsString()
	lastName: string;
	@IsOptional()
	@IsString()
	city: string;
	@IsOptional()
	@IsEnum(EGender)
	gender: EGender;
	@IsOptional()
	@Type(() => Date)
	@IsDate()
	birthDate: Date;
	isNew: boolean;
}
