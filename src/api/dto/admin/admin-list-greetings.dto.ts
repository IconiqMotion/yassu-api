import { IsNumber, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class AdminListGreetingsDTO {
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    limit?: number = 20;

    @IsString()
    @IsOptional()
    search?: string;

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    finishedProcessing?: boolean;

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    hasMoney?: boolean;

    @IsDateString()
    @IsOptional()
    dateFrom?: string;

    @IsDateString()
    @IsOptional()
    dateTo?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    senderUserId?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    receiverUserId?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    eventId?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    groupId?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    minAmount?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    maxAmount?: number;

    @IsString()
    @IsOptional()
    sortBy?: 'createdAt' | 'amountOfMoney' = 'createdAt';

    @IsString()
    @IsOptional()
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

