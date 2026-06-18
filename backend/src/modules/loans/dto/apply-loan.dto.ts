import { IsString, IsNumber, IsOptional, IsArray, Min } from 'class-validator';

export class ApplyLoanDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(0)
  principal: number;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsNumber()
  @IsOptional()
  repaymentPeriod?: number;

  @IsArray()
  @IsOptional()
  guarantors?: { memberId: string; amount: number }[];

  @IsOptional()
  collateral?: { type: string; description?: string; estimatedValue: number };
}
