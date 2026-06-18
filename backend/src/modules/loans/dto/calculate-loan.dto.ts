import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CalculateLoanDto {
  @IsNumber()
  @Min(0)
  principal: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  interestRate: number;

  @IsNumber()
  @Min(1)
  durationMonths: number;

  @IsString()
  @IsOptional()
  interestMethod?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  processingFee?: number;
}
