export interface InterestCalculationInput {
  principal: number;
  interestRate: number;
  durationMonths: number;
  durationDays?: number;
  gracePeriod?: number;
}

export interface InterestCalculationResult {
  interestAmount: number;
  totalAmount: number;
  monthlyInstallment: number;
  schedule: InstallmentItem[];
}

export interface InstallmentItem {
  installmentNumber: number;
  dueDate: Date;
  principal: number;
  interest: number;
  totalAmount: number;
  remainingBalance: number;
}

export interface InterestCalculationStrategy {
  readonly name: string;
  calculate(input: InterestCalculationInput): InterestCalculationResult;
}
