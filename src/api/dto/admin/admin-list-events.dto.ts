import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EMoneyRequestedStatus } from '../../models/enums';

export class AdminListEventsDTO {
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

    @IsEnum(EMoneyRequestedStatus)
    @IsOptional()
    moneyRequestedStatus?: EMoneyRequestedStatus;

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    finishedProcessing?: boolean;

    @IsDateString()
    @IsOptional()
    dateFrom?: string;

    @IsDateString()
    @IsOptional()
    dateTo?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    receiverUserId?: number;

    @IsString()
    @IsOptional()
    sortBy?: 'createdAt' | 'day' | 'month' | 'year' | 'name' = 'createdAt';

    @IsString()
    @IsOptional()
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

