import { InterestCalculationStrategy, InterestCalculationInput, InterestCalculationResult, InstallmentItem } from './interest-calculation-strategy.interface';

export class ReducingBalanceStrategy implements InterestCalculationStrategy {
  readonly name = 'REDUCING_BALANCE';

  calculate(input: InterestCalculationInput): InterestCalculationResult {
    const { principal, interestRate, durationMonths } = input;
    const monthlyRate = interestRate / 100 / 12;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, durationMonths))
      / (Math.pow(1 + monthlyRate, durationMonths) - 1);
    const totalAmount = Math.ceil(payment * durationMonths);
    const interestAmount = totalAmount - principal;
    const monthlyInstallment = Math.ceil(payment);
    const schedule = this.generateSchedule(principal, monthlyRate, monthlyInstallment, durationMonths);

    return { interestAmount, totalAmount, monthlyInstallment, schedule };
  }

  private generateSchedule(
    principal: number,
    monthlyRate: number,
    payment: number,
    months: number,
  ): InstallmentItem[] {
    const schedule: InstallmentItem[] = [];
    const now = new Date();
    let balance = principal;

    for (let i = 1; i <= months; i++) {
      const dueDate = new Date(now.getFullYear(), now.getMonth() + i, now.getDate());
      const interest = Math.round(balance * monthlyRate);
      const principalAmt = Math.round((i === months ? balance : payment) - interest);
      const amount = principalAmt + interest;

      balance = Math.max(0, balance - principalAmt);

      schedule.push({
        installmentNumber: i,
        dueDate,
        principal: principalAmt,
        interest,
        totalAmount: amount,
        remainingBalance: balance,
      });
    }

    return schedule;
  }
}
