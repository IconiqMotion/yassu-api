import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EMoneyRequestedStatus } from '../../models/enums';

export class AdminListGroupsDTO {
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
    isOpened?: boolean;

    @IsDateString()
    @IsOptional()
    dueDateFrom?: string;

    @IsDateString()
    @IsOptional()
    dueDateTo?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    adminUserId?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    targetUserId?: number;

    @IsString()
    @IsOptional()
    sortBy?: 'createdAt' | 'dueDate' | 'name' = 'createdAt';

    @IsString()
    @IsOptional()
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

