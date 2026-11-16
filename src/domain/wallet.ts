import { Money } from "./value-objects/money";
export interface WalletState {
  id: string;
  playerId: string;
  currency: string;
  balance: Money;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
export interface WalletBalanceChange {
  before: Money;
  after: Money;
}
export class Wallet {
  private constructor(
    public readonly id: string,
    public readonly playerId: string,
    public readonly currency: string,
    private _balance: Money,
    private _version: number,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}
  static open(props: {
    id: string;
    playerId: string;
    initialBalance: Money;
  }): Wallet {
    if (props.initialBalance.isNegative()) {
      throw new Error("O saldo inicial da carteira não pode ser negativo");
    }
    const now = new Date();
    return new Wallet(
      props.id,
      props.playerId,
      props.initialBalance.currency,
      props.initialBalance,
      1,
      now,
      now,
    );
  }
  static rehydrate(state: WalletState): Wallet {
    return new Wallet(
      state.id,
      state.playerId,
      state.currency,
      state.balance,
      state.version,
      state.createdAt,
      state.updatedAt,
    );
  }
  get balance(): Money {
    return this._balance;
  }

  get version(): number {
    return this._version;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
  debit(amount: Money): WalletBalanceChange {
    this.assertSameCurrency(amount);
    this.assertNonNegativeAmount(amount);

    if (this._balance.isLessThan(amount)) {
      throw new Error("Saldo insuficiente para realizar o débito");
    }
    return this.applyBalance(this._balance.subtract(amount));
  }
  credit(amount: Money): WalletBalanceChange {
    this.assertSameCurrency(amount);
    this.assertNonNegativeAmount(amount);
    return this.applyBalance(this._balance.add(amount));
  }
  private applyBalance(nextBalance: Money): WalletBalanceChange {
    const before = this._balance;
    if (!before.equals(nextBalance)) {
      this._balance = nextBalance;
      this._version += 1;
      this._updatedAt = new Date();
    }
    return { before, after: this._balance };
  }
  private assertSameCurrency(money: Money): void {
    if (this.currency !== money.currency) {
      throw new Error("A operação deve usar a mesma moeda da carteira");
    }
  }
  private assertNonNegativeAmount(amount: Money): void {
    if (amount.isNegative()) {
      throw new Error("O valor da operação não pode ser negativo");
    }
  }
}
