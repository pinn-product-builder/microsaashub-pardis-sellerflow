import { ValueObject } from '@/domain/shared/ValueObject';
import { DomainError } from '@/domain/shared/DomainError';

interface MarginProps {
  value: number;     // Value in currency
  percent: number;   // Percentage
}

type MarginLevel = 'green' | 'yellow' | 'orange' | 'red';

export class Margin extends ValueObject<MarginProps> {
  private constructor(props: MarginProps) {
    super(props);
  }

  get value(): number {
    return this.props.value;
  }

  get percent(): number {
    return this.props.percent;
  }

  static create(value: number, percent: number): Margin {
    return new Margin({ 
      value: Math.round(value * 100) / 100,
      percent: Math.round(percent * 100) / 100 
    });
  }

  static fromPrices(sellingPrice: number, costPrice: number): Margin {
    if (costPrice <= 0) {
      throw new DomainError('Preço de custo deve ser maior que zero');
    }
    const value = sellingPrice - costPrice;
    const percent = ((sellingPrice - costPrice) / costPrice) * 100;
    return Margin.create(value, percent);
  }

  static zero(): Margin {
    return new Margin({ value: 0, percent: 0 });
  }

  getLevel(thresholds: { green: number; yellow: number; orange: number }): MarginLevel {
    if (this.percent >= thresholds.green) return 'green';
    if (this.percent >= thresholds.yellow) return 'yellow';
    if (this.percent >= thresholds.orange) return 'orange';
    return 'red';
  }

  isAuthorized(threshold: number): boolean {
    return this.percent >= threshold;
  }

  requiresApproval(minimumAuthorized: number): boolean {
    return this.percent < minimumAuthorized;
  }
}
