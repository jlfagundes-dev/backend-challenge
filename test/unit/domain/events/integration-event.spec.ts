import { describe, expect, test } from "bun:test";
import { WagerTransaction, WagerTransactionKind } from "../../../../src/domain/wager-transaction";
import { WagerTransactionProcessed } from "../../../../src/domain/events/wager-transaction-processed";
import { Money } from "../../../../src/domain/value-objects/money";

describe("WagerTransactionProcessed", () => {
  test("serializes a processed transaction as an integration event", () => {
    const transaction = WagerTransaction.create({
      id: "transaction-1", providerId: "provider-1", externalTransactionId: "external-1",
      idempotencyKey: "key-1", payloadHash: "hash", walletId: "wallet-1",
      playerId: "player-1", roundId: "round-1", gameId: "game-1",
      kind: WagerTransactionKind.Bet, money: Money.from({ amount: "10.00", currency: "BRL" }),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    transaction.markProcessed(undefined, new Date("2026-01-01T00:01:00.000Z"));
    const event = WagerTransactionProcessed.from(transaction, {
      eventId: "event-1", correlationId: "correlation-1",
      occurredAt: new Date("2026-01-01T00:02:00.000Z"),
    });
    const json = event.toJSON();

    expect(json.eventType).toBe("WagerTransactionProcessed");
    expect(json.occurredAt).toBe("2026-01-01T00:02:00.000Z");
    expect(json.data.money).toEqual({ amount: "10.00", currency: "BRL" });
  });
  test("rejects an unprocessed transaction", () => {
    const transaction = WagerTransaction.create({
      id: "transaction-1", providerId: "provider-1", externalTransactionId: "external-1",
      idempotencyKey: "key-1", payloadHash: "hash", walletId: "wallet-1",
      playerId: "player-1", roundId: "round-1", gameId: "game-1",
      kind: WagerTransactionKind.Bet, money: Money.from({ amount: "10.00", currency: "BRL" }),
      createdAt: new Date(),
    });
    expect(() => WagerTransactionProcessed.from(transaction, {
      eventId: "event-1", correlationId: "correlation-1", occurredAt: new Date(),
    })).toThrow("O evento exige uma transação processada");
  });
});
