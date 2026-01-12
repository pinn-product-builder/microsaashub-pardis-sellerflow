import { ValueObject } from '@/domain/shared/ValueObject';
import { DomainError } from '@/domain/shared/DomainError';

interface MoneyProps {
  amount: number;
  currency: string;
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  static create(amount: number, currency: string = 'BRL'): Money {
    if (amount < 0) {
      throw new DomainError('Valor monetário não pode ser negativo');
    }
    // Round to 2 decimal places
    const roundedAmount = Math.round(amount * 100) / 100;
    return new Money({ amount: roundedAmount, currency });
  }

  static zero(currency: string = 'BRL'): Money {
    return new Money({ amount: 0, currency });
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return Money.create(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new DomainError('Resultado não pode ser negativo');
    }
    return Money.create(result, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new DomainError('Fator não pode ser negativo');
    }
    return Money.create(this.amount * factor, this.currency);
  }

  percentage(percent: number): Money {
    return Money.create((this.amount * percent) / 100, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount < other.amount;
  }

  format(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: this.currency
    }).format(this.amount);
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new DomainError('Moedas diferentes não podem ser operadas');
    }
  }
}
