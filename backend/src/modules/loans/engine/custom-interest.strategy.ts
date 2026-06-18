import { InterestCalculationStrategy, InterestCalculationInput, InterestCalculationResult, InstallmentItem } from './interest-calculation-strategy.interface';

export class CustomInterestStrategy implements InterestCalculationStrategy {
  readonly name = 'CUSTOM';

  constructor(private readonly customRateFn?: (input: InterestCalculationInput) => {
    interestAmount: number;
    schedule: { installmentNumber: number; dueDate: Date; principal: number; interest: number; totalAmount: number; remainingBalance: number }[];
  }) {}

  calculate(input: InterestCalculationInput): InterestCalculationResult {
    if (this.customRateFn) {
      const result = this.customRateFn(input);
      const totalAmount = input.principal + result.interestAmount;
      const monthlyInstallment = Math.ceil(totalAmount / input.durationMonths);
      return { ...result, totalAmount, monthlyInstallment, schedule: result.schedule };
    }
    // Default to flat rate as fallback
    const annualRate = input.interestRate / 100;
    const years = input.durationMonths / 12;
    const interestAmount = input.principal * annualRate * years;
    const totalAmount = input.principal + interestAmount;
    const monthlyInstallment = Math.ceil(totalAmount / input.durationMonths);
    const schedule = this.generateDefaultSchedule(input.principal, totalAmount, interestAmount, monthlyInstallment, input.durationMonths);

    return { interestAmount, totalAmount, monthlyInstallment, schedule };
  }

  private generateDefaultSchedule(
    principal: number,
    totalAmount: number,
    interestAmount: number,
    installmentAmount: number,
    months: number,
  ): InstallmentItem[] {
    const schedule: InstallmentItem[] = [];
    const now = new Date();
    let balance = totalAmount;

    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(now.getFullYear(), now.getMonth() + i, now.getDate());
      const isLast = i === months;
      const amount = isLast ? balance : installmentAmount;
      const pct = totalAmount > 0 ? amount / totalAmount : 0;
      const prin = Math.round(principal * pct);
      const intr = Math.round(interestAmount * pct);

      balance = Math.max(0, balance - amount);

      schedule.push({
        installmentNumber: i,
        dueDate,
        principal: prin,
        interest: intr,
        totalAmount: amount,
        remainingBalance: balance,
      });
    }

    return schedule;
  }
}
