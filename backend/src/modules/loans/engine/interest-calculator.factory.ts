import { InterestCalculationStrategy } from './interest-calculation-strategy.interface';
import { FlatRateStrategy } from './flat-rate.strategy';
import { ReducingBalanceStrategy } from './reducing-balance.strategy';
import { CompoundInterestStrategy } from './compound-interest.strategy';
import { CustomInterestStrategy } from './custom-interest.strategy';

export class InterestCalculatorFactory {
  private static strategies = new Map<string, InterestCalculationStrategy>([
    ['FLAT', new FlatRateStrategy()],
    ['REDUCING_BALANCE', new ReducingBalanceStrategy()],
    ['REDUCING', new ReducingBalanceStrategy()],
    ['COMPOUND', new CompoundInterestStrategy()],
    ['CUSTOM', new CustomInterestStrategy()],
  ]);

  static getStrategy(method: string): InterestCalculationStrategy {
    const strategy = this.strategies.get(method.toUpperCase());
    if (!strategy) {
      console.warn(`Unknown interest method "${method}", falling back to FLAT`);
      return this.strategies.get('FLAT')!;
    }
    return strategy;
  }

  static registerStrategy(name: string, strategy: InterestCalculationStrategy): void {
    this.strategies.set(name.toUpperCase(), strategy);
  }

  static getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}
