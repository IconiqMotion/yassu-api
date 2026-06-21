import {IsArray, IsDate, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUrl} from 'class-validator';
import {Transform, Type} from "class-transformer";

export class GetAllDTO {

	@IsNumber()
	@IsOptional()
	@Type(() => Number)
	page: number;

	@IsNumber()
	@IsOptional()
	@Type(() => Number)
	limit: number;
}
