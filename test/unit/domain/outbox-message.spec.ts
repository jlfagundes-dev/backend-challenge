import { describe, expect, test } from "bun:test";
import { OutboxMessage } from "../../../src/domain/outbox-message";
import { WagerTransaction, WagerTransactionKind } from "../../../src/domain/wager-transaction";
import { WagerTransactionProcessed } from "../../../src/domain/events/wager-transaction-processed";
import { Money } from "../../../src/domain/value-objects/money";

function event() {
  const transaction = WagerTransaction.create({
    id: "transaction-1", providerId: "provider-1", externalTransactionId: "external-1",
    idempotencyKey: "key-1", payloadHash: "hash", walletId: "wallet-1",
    playerId: "player-1", roundId: "round-1", gameId: "game-1",
    kind: WagerTransactionKind.Bet, money: Money.from({ amount: "10.00", currency: "BRL" }),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  });
  transaction.markProcessed(undefined, new Date("2026-01-01T00:01:00.000Z"));
  return WagerTransactionProcessed.from(transaction, {
    eventId: "event-1", correlationId: "correlation-1",
    occurredAt: new Date("2026-01-01T00:02:00.000Z"),
  });
}

describe("OutboxMessage", () => {
  test("enqueues a pending integration event", () => {
    const message = OutboxMessage.enqueue(event());
    expect(message.isPending()).toBe(true);
    expect(message.attempts).toBe(0);
    expect(message.payload.eventType).toBe("WagerTransactionProcessed");
    expect(message.isDue(new Date())).toBe(true);
  });
  test("schedules retry with exponential backoff", () => {
    const message = OutboxMessage.enqueue(event());
    const now = new Date("2026-01-01T00:00:00.000Z");
    message.scheduleRetry(now);
    expect(message.attempts).toBe(1);
    expect(message.nextAttemptAt).toEqual(new Date("2026-01-01T00:00:01.000Z"));
    expect(message.isDue(now)).toBe(false);
  });
  test("marks a message as published once", () => {
    const message = OutboxMessage.enqueue(event());
    const publishedAt = new Date("2026-01-01T00:01:00.000Z");
    message.markPublished(publishedAt);
    expect(message.isPending()).toBe(false);
    expect(message.publishedAt).toBe(publishedAt);
    expect(() => message.markPublished(new Date())).toThrow(
      "A mensagem Outbox já foi publicada",
    );
  });
});
