import { IsNumber, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class AdminListInternalTransactionsDTO {
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    limit?: number = 20;

    @IsBoolean()
    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    isPaid?: boolean;

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
    withdrawType?: string;

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
    sortBy?: 'createdAt' | 'amount' | 'transactionDate' = 'createdAt';

    @IsString()
    @IsOptional()
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

