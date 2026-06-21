import { IsNumber, IsOptional } from 'class-validator';
import { Type } from "class-transformer";

export class GetAllNotificationsDTO {

	@IsNumber()
	@IsOptional()
	@Type(() => Number)
	page: number = 1;

	@IsNumber()
	@IsOptional()
	@Type(() => Number)
	limit: number = 20;
}
