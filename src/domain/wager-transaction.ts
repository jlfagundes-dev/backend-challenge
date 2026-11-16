import { Money } from "./value-objects/money";
import { LedgerDirection } from "./ledger-entry";
import {
  CreateWagerTransactionProps, FailureCode, WagerTransactionKind,
  WagerTransactionState, WagerTransactionStatus,
} from "./wager-transaction.types";
export * from "./wager-transaction.types";
export class WagerTransaction {
  public readonly id: string; public readonly providerId: string;
  public readonly externalTransactionId: string; public readonly idempotencyKey: string;
  public readonly payloadHash: string; public readonly walletId: string;
  public readonly playerId: string; public readonly roundId: string;
  public readonly gameId: string; public readonly kind: WagerTransactionKind;
  public readonly money: Money; public readonly referenceExternalTransactionId?: string;
  public readonly createdAt: Date; private _status: WagerTransactionStatus;
  private _referenceTransactionId?: string; private _failureCode?: FailureCode;
  private _processedAt?: Date;
  private constructor(state: WagerTransactionState) {
    this.id = state.id; this.providerId = state.providerId;
    this.externalTransactionId = state.externalTransactionId;
    this.idempotencyKey = state.idempotencyKey; this.payloadHash = state.payloadHash;
    this.walletId = state.walletId; this.playerId = state.playerId;
    this.roundId = state.roundId; this.gameId = state.gameId; this.kind = state.kind;
    this.money = state.money; this.referenceExternalTransactionId = state.referenceExternalTransactionId;
    this.createdAt = state.createdAt; this._status = state.status;
    this._referenceTransactionId = state.referenceTransactionId;
    this._failureCode = state.failureCode; this._processedAt = state.processedAt;
  }
  static create(props: CreateWagerTransactionProps): WagerTransaction {
    if (props.money.isNegative()) throw new Error("O valor da transação não pode ser negativo");
    this.assertReference(props.kind, props.referenceExternalTransactionId);
    return new WagerTransaction({ ...props, status: WagerTransactionStatus.Pending });
  }
  static rehydrate(state: WagerTransactionState): WagerTransaction {
    return new WagerTransaction(state);
  }
  get status(): WagerTransactionStatus { return this._status; }
  get referenceTransactionId(): string | undefined { return this._referenceTransactionId; }
  get failureCode(): FailureCode | undefined { return this._failureCode; }
  get processedAt(): Date | undefined { return this._processedAt; }
  requiresReference(): boolean {
    return this.kind === WagerTransactionKind.Refund || this.kind === WagerTransactionKind.Rollback;
  }
  matchesPayload(payloadHash: string): boolean {
    return this.payloadHash === payloadHash;
  }
  affectsBalance(): boolean {
    return this.kind !== WagerTransactionKind.Loss;
  }
  ledgerDirectionFor(reference?: WagerTransaction): LedgerDirection | undefined {
    if (this.kind === WagerTransactionKind.Loss) return undefined;
    if (this.kind === WagerTransactionKind.Opening ||
      this.kind === WagerTransactionKind.Win || this.kind === WagerTransactionKind.Refund) {
      return LedgerDirection.Credit;
    }
    if (this.kind === WagerTransactionKind.Bet) return LedgerDirection.Debit;
    if (!reference) throw new Error("O ROLLBACK exige uma transação de referência");
    const direction = reference.ledgerDirectionFor();
    if (!direction) throw new Error("A transação referenciada não possui Ledger");
    return direction === LedgerDirection.Debit ? LedgerDirection.Credit : LedgerDirection.Debit;
  }
  markPendingReference(): void {
    this.assertMutable();
    this._status = WagerTransactionStatus.PendingReference;
  }
  markProcessed(referenceTransactionId: string | undefined, at: Date): void {
    this.assertMutable();
    if (this._status !== WagerTransactionStatus.Pending &&
      this._status !== WagerTransactionStatus.PendingReference) {
      throw new Error("A transação não está aguardando processamento");
    }
    this._status = WagerTransactionStatus.Processed;
    this._referenceTransactionId = referenceTransactionId;
    this._processedAt = at;
  }
  reject(code: FailureCode): void {
    this.assertMutable();
    this._status = WagerTransactionStatus.Rejected;
    this._failureCode = code;
  }
  fail(code: FailureCode): void {
    this.assertMutable();
    this._status = WagerTransactionStatus.Failed;
    this._failureCode = code;
  }
  isTerminal(): boolean {
    return [WagerTransactionStatus.Processed, WagerTransactionStatus.Rejected,
      WagerTransactionStatus.Failed].includes(this._status);
  }
  private static assertReference(kind: WagerTransactionKind, reference?: string): void {
    const required = kind === WagerTransactionKind.Refund || kind === WagerTransactionKind.Rollback;
    if (required && !reference) throw new Error("A transação exige uma referência externa");
  }
  private assertMutable(): void {
    if (this.isTerminal()) throw new Error("A transação já está em estado terminal");
  }
}
