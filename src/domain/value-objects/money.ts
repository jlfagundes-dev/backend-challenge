import Decimal from "decimal.js"; // fornece o tipo decimal sem usar number

export interface MoneyProps {
  amount: string;
  currency: string;
}

export class Money {
  private constructor(
    private readonly value: Decimal,
    public readonly currency: string,
  ) {}

  static from(props: MoneyProps): Money {
    return new Money(this.parseAmount(props.amount), this.parseCurrency(props.currency));
  }

  static zero(currency: string): Money {
    return new Money(new Decimal(0), this.parseCurrency(currency));
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.add(other.value), this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.value.sub(other.value), this.currency);
  }

  negate(): Money {
    return new Money(this.value.neg(), this.currency);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.isPositive();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.value.lessThan(other.value);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.value.eq(other.value);
  }

  toJSON(): MoneyProps {
    return { amount: this.value.toFixed(2), currency: this.currency };
  }

  toString(): string {
    return this.value.toFixed(2);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error("Os valores monetários devem usar a mesma moeda");
    }
  }

  private static parseAmount(amount: string): Decimal {
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) {
      throw new Error("O valor monetário deve ser um decimal não negativo com até 2 casas");
    }

    return new Decimal(amount);
  }

  private static parseCurrency(currency: string): string {
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error("A moeda deve ser um código ISO-4217 com 3 letras");
    }

    return currency;
  }
}