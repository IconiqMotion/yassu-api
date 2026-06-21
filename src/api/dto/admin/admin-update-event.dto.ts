import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminUpdateEventDTO {
    @IsNumber()
    @Type(() => Number)
    amount: number;

    @IsString()
    reference: string;

    @IsString()
    @IsOptional()
    comment?: string;
}

