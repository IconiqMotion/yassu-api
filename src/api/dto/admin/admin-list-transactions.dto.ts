import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ETransactionType } from '../../models/enums';

export class AdminListTransactionsDTO {
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

    @IsEnum(ETransactionType)
    @IsOptional()
    type?: ETransactionType;

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
    sortBy?: 'createdAt' | 'amount' | 'type' = 'createdAt';

    @IsString()
    @IsOptional()
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

