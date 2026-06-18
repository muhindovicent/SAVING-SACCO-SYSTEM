import { InterestCalculationStrategy, InterestCalculationInput, InterestCalculationResult, InstallmentItem } from './interest-calculation-strategy.interface';

export class FlatRateStrategy implements InterestCalculationStrategy {
  readonly name = 'FLAT';

  calculate(input: InterestCalculationInput): InterestCalculationResult {
    const { principal, interestRate, durationMonths } = input;
    const annualRate = interestRate / 100;
    const years = durationMonths / 12;
    const interestAmount = principal * annualRate * years;
    const totalAmount = principal + interestAmount;
    const monthlyInstallment = Math.ceil(totalAmount / durationMonths);
    const schedule = this.generateSchedule(principal, totalAmount, interestAmount, monthlyInstallment, durationMonths, interestRate);

    return { interestAmount, totalAmount, monthlyInstallment, schedule };
  }

  private generateSchedule(
    principal: number,
    totalAmount: number,
    interestAmount: number,
    installmentAmount: number,
    months: number,
    rate: number,
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
