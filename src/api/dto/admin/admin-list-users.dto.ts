import { IsEnum, IsNumber, IsOptional, IsString, IsDateString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EGender } from '../../models/enums';

export class AdminListUsersDTO {
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
    isActive?: boolean;

    @IsEnum(EGender)
    @IsOptional()
    gender?: EGender;

    @IsDateString()
    @IsOptional()
    registeredFrom?: string;

    @IsDateString()
    @IsOptional()
    registeredTo?: string;

    @IsString()
    @IsOptional()
    city?: string;

    @IsString()
    @IsOptional()
    sortBy?: 'createdAt' | 'fullName' | 'phone' | 'email' = 'createdAt';

    @IsString()
    @IsOptional()
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

