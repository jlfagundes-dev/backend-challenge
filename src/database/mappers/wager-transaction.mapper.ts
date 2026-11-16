import { Money } from "../../domain/value-objects/money";
import { WagerTransaction } from "../../domain/wager-transaction";
import { WagerTransactionEntity } from "../entities/wager-transaction.entity";

export class WagerTransactionMapper {
  static toDomain(entity: WagerTransactionEntity): WagerTransaction {
    return WagerTransaction.rehydrate({
      id: entity.id,
      providerId: entity.providerId,
      externalTransactionId: entity.externalTransactionId,
      idempotencyKey: entity.idempotencyKey,
      payloadHash: entity.payloadHash,
      walletId: entity.walletId,
      playerId: entity.playerId,
      roundId: entity.roundId,
      gameId: entity.gameId,
      kind: entity.kind,
      money: Money.from({ amount: entity.amount, currency: entity.currency }),
      referenceExternalTransactionId: entity.referenceExternalTransactionId,
      createdAt: entity.createdAt,
      status: entity.status,
      referenceTransactionId: entity.referenceTransactionId,
      failureCode: entity.failureCode,
      processedAt: entity.processedAt,
    });
  }

  static toEntity(transaction: WagerTransaction): WagerTransactionEntity {
    const entity = new WagerTransactionEntity();
    entity.id = transaction.id;
    entity.providerId = transaction.providerId;
    entity.externalTransactionId = transaction.externalTransactionId;
    entity.idempotencyKey = transaction.idempotencyKey;
    entity.payloadHash = transaction.payloadHash;
    entity.walletId = transaction.walletId;
    entity.playerId = transaction.playerId;
    entity.roundId = transaction.roundId;
    entity.gameId = transaction.gameId;
    entity.kind = transaction.kind;
    entity.amount = transaction.money.toString();
    entity.currency = transaction.money.currency;
    entity.status = transaction.status;
    entity.referenceExternalTransactionId = transaction.referenceExternalTransactionId;
    entity.referenceTransactionId = transaction.referenceTransactionId;
    entity.failureCode = transaction.failureCode;
    entity.processedAt = transaction.processedAt;
    entity.createdAt = transaction.createdAt;
    return entity;
  }
}
