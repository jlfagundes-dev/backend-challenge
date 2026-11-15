import { Money } from "./value-objects/money";

export enum WagerTransactionKind {
  Opening = "OPENING", Bet = "BET", Win = "WIN", Loss = "LOSS",
  Refund = "REFUND", Rollback = "ROLLBACK",
}
export enum WagerTransactionStatus {
  Pending = "PENDING", PendingReference = "PENDING_REFERENCE",
  Processed = "PROCESSED", Rejected = "REJECTED", Failed = "FAILED",
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
