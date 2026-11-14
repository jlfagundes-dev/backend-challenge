import { Money } from "./value-objects/money";

export enum WagerTransactionKind {
  Opening = "OPENING",
  Bet = "BET",
  Win = "WIN",
  Loss = "LOSS",
  Refund = "REFUND",
  Rollback = "ROLLBACK",
}
export enum WagerTransactionStatus {
  Pending = "PENDING",
  PendingReference = "PENDING_REFERENCE",
  Processed = "PROCESSED",
  Rejected = "REJECTED",
  Failed = "FAILED",
}
export type FailureCode = string;
export interface CreateWagerTransactionProps {
  id: string; providerId: string; externalTransactionId: string;
  idempotencyKey: string; payloadHash: string; walletId: string;
  playerId: string; roundId: string; gameId: string; kind: WagerTransactionKind;
  money: Money; referenceExternalTransactionId?: string; createdAt: Date;
}
export interface WagerTransactionState extends CreateWagerTransactionProps {
  status: WagerTransactionStatus; referenceTransactionId?: string;
  failureCode?: FailureCode; processedAt?: Date;
}
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
  private static assertReference(kind: WagerTransactionKind, reference?: string): void {
    const required = kind === WagerTransactionKind.Refund || kind === WagerTransactionKind.Rollback;
    if (required && !reference) throw new Error("A transação exige uma referência externa");
  }
}
