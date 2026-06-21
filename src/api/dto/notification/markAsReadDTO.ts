import { IsNumber } from 'class-validator';
import { Type } from "class-transformer";

export class MarkAsReadDTO {

	@IsNumber()
	@Type(() => Number)
	id: number;
}
