import { IsString, IsNumber, IsOptional, IsBoolean, Min, Max, IsEnum } from 'class-validator';

export enum InterestMethod {
  FLAT = 'FLAT',
  REDUCING_BALANCE = 'REDUCING_BALANCE',
  COMPOUND = 'COMPOUND',
  CUSTOM = 'CUSTOM',
}

export class CreateLoanProductDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  productType?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @Min(0)
  maxAmount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate: number;

  @IsString()
  @IsOptional()
  interestMethod?: string;

  @IsNumber()
  @Min(1)
  repaymentPeriod: number;

  @IsString()
  @IsOptional()
  repaymentFreq?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  gracePeriod?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  latePenaltyRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  latePenaltyFixed?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  processingFee?: number;

  @IsBoolean()
  @IsOptional()
  requiresGuarantor?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresCollateral?: boolean;

  @IsNumber()
  @IsOptional()
  maxGuarantors?: number;
}

export class UpdateLoanProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  productType?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minAmount?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxAmount?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  interestRate?: number;

  @IsString()
  @IsOptional()
  interestMethod?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  repaymentPeriod?: number;

  @IsString()
  @IsOptional()
  repaymentFreq?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  gracePeriod?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  latePenaltyRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  latePenaltyFixed?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  processingFee?: number;

  @IsBoolean()
  @IsOptional()
  requiresGuarantor?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresCollateral?: boolean;

  @IsNumber()
  @IsOptional()
  maxGuarantors?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
