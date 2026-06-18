import { InterestCalculationStrategy, InterestCalculationInput, InterestCalculationResult, InstallmentItem } from './interest-calculation-strategy.interface';

export class CompoundInterestStrategy implements InterestCalculationStrategy {
  readonly name = 'COMPOUND';

  calculate(input: InterestCalculationInput): InterestCalculationResult {
    const { principal, interestRate, durationMonths } = input;
    const monthlyRate = interestRate / 100 / 12;
    const compoundFactor = Math.pow(1 + monthlyRate, durationMonths);
    const totalAmount = principal * compoundFactor;
    const interestAmount = totalAmount - principal;
    const monthlyInstallment = Math.ceil(totalAmount / durationMonths);
    const schedule = this.generateSchedule(principal, totalAmount, interestAmount, monthlyInstallment, durationMonths, monthlyRate);

    return { interestAmount, totalAmount, monthlyInstallment, schedule };
  }

  private generateSchedule(
    principal: number,
    totalAmount: number,
    interestAmount: number,
    installmentAmount: number,
    months: number,
    monthlyRate: number,
  ): InstallmentItem[] {
    const schedule: InstallmentItem[] = [];
    const now = new Date();
    let balance = totalAmount;

    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(now.getFullYear(), now.getMonth() + i, now.getDate());
      const isLast = i === months;
      const amount = isLast ? balance : installmentAmount;
      const interest = Math.round(balance * monthlyRate);
      const prin = amount - interest;

      balance = Math.max(0, balance - amount);

      schedule.push({
        installmentNumber: i,
        dueDate,
        principal: Math.max(0, prin),
        interest,
        totalAmount: amount,
        remainingBalance: balance,
      });
    }

    return schedule;
  }
}
