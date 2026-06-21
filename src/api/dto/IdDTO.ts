import {IsArray, IsBoolean, IsDate, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUrl} from 'class-validator';
import {Transform, Type} from "class-transformer";

export class IdDTO {

	@IsNumber()
	@Type(() => Number)
	@IsOptional()
	id: number;

}
