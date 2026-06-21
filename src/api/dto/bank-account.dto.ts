import {IsBoolean, IsEnum, IsNumber, IsOptional, IsString, ValidateIf} from 'class-validator';
import {EWithdrawType} from "../models/bank-account.model";

export class CreateBankAccountDTO {
    @IsEnum(EWithdrawType)
    withdrawType: EWithdrawType;

    // Required for BIT
    @ValidateIf(o => o.withdrawType === EWithdrawType.BIT)
    @IsString()
    bitPhoneNumber?: string;

    // Required for BANK
    @ValidateIf(o => o.withdrawType === EWithdrawType.BANK)
    @IsString()
    bank?: string;

    @ValidateIf(o => o.withdrawType === EWithdrawType.BANK)
    @IsString()
    branch?: string;

    @ValidateIf(o => o.withdrawType === EWithdrawType.BANK)
    @IsString()
    accountNumber?: string;

    @ValidateIf(o => o.withdrawType === EWithdrawType.BANK)
    @IsString()
    accountHolderName?: string;

    @ValidateIf(o => o.withdrawType === EWithdrawType.BANK)
    @IsString()
    accountNationalId?: string;

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}

export class UpdateBankAccountDTO {
    @IsOptional()
    @IsString()
    bitPhoneNumber?: string;

    @IsOptional()
    @IsString()
    bank?: string;

    @IsOptional()
    @IsString()
    branch?: string;

    @IsOptional()
    @IsString()
    accountNumber?: string;

    @IsOptional()
    @IsString()
    accountHolderName?: string;

    @IsOptional()
    @IsString()
    accountNationalId?: string;

    @IsOptional()
    @IsBoolean()
    isDefault?: boolean;
}
