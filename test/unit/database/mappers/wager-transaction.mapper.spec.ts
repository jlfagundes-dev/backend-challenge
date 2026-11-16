import { describe, expect, test } from "bun:test";
import { Money } from "../../../../src/domain/value-objects/money";
import { WagerTransaction } from "../../../../src/domain/wager-transaction";
import { WagerTransactionKind, WagerTransactionStatus } from "../../../../src/domain/wager-transaction.types";
import { WagerTransactionEntity } from "../../../../src/database/entities/wager-transaction.entity";
import { WagerTransactionMapper } from "../../../../src/database/mappers/wager-transaction.mapper";

const createdAt = new Date("2026-01-01T00:00:00.000Z");

describe("WagerTransactionMapper", () => {
  test("converts an entity to the domain", () => {
    const entity = new WagerTransactionEntity();
    Object.assign(entity, {
      id: "transaction-1", providerId: "provider-a",
      externalTransactionId: "external-1", idempotencyKey: "key-1",
      payloadHash: "hash-1", walletId: "wallet-1", playerId: "player-1",
      roundId: "round-1", gameId: "game-1", kind: WagerTransactionKind.Bet,
      amount: "25.00", currency: "BRL", status: "PENDING", createdAt,
    });

    const transaction = WagerTransactionMapper.toDomain(entity);

    expect(transaction.money.toString()).toBe("25.00");
    expect(transaction.kind).toBe(WagerTransactionKind.Bet);
    expect(transaction.status).toBe(WagerTransactionStatus.Pending);
  });

  test("converts a domain transaction to an entity", () => {
    const transaction = WagerTransaction.create({
      id: "transaction-1", providerId: "provider-a",
      externalTransactionId: "external-1", idempotencyKey: "key-1",
      payloadHash: "hash-1", walletId: "wallet-1", playerId: "player-1",
      roundId: "round-1", gameId: "game-1", kind: WagerTransactionKind.Bet,
      money: Money.from({ amount: "25.00", currency: "BRL" }), createdAt,
    });

    const entity = WagerTransactionMapper.toEntity(transaction);

    expect(entity.amount).toBe("25.00");
    expect(entity.currency).toBe("BRL");
    expect(entity.idempotencyKey).toBe("key-1");
  });
});
