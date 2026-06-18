import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class RepayLoanDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
