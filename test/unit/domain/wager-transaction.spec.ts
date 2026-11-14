import { describe, expect, test } from "bun:test";
import {
  WagerTransaction,
  WagerTransactionKind,
  WagerTransactionStatus,
} from "../../../src/domain/wager-transaction";
import { Money } from "../../../src/domain/value-objects/money";

describe("WagerTransaction", () => {
  test("creates a BET in PENDING status", () => {
    const transaction = WagerTransaction.create(props());

    expect(transaction.status).toBe(WagerTransactionStatus.Pending);
    expect(transaction.kind).toBe(WagerTransactionKind.Bet);
    expect(transaction.requiresReference()).toBe(false);
  });
  test("requires an external reference for REFUND and ROLLBACK", () => {
    for (const kind of [WagerTransactionKind.Refund, WagerTransactionKind.Rollback]) {
      expect(() => WagerTransaction.create(props({ kind }))).toThrow(
        "A transação exige uma referência externa",
      );
    }
  });
  test("rejects a negative amount", () => {
    expect(() =>
      WagerTransaction.create(props({ money: money("10.00").negate() })),
    ).toThrow("O valor da transação não pode ser negativo");
  });
  test("rehydrates persisted status without transition validation", () => {
    const transaction = WagerTransaction.rehydrate({
      ...props(),
      status: WagerTransactionStatus.Processed,
      processedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(transaction.status).toBe(WagerTransactionStatus.Processed);
    expect(transaction.processedAt).toBeInstanceOf(Date);
  });
});
function money(amount: string): Money {
  return Money.from({ amount, currency: "BRL" });
}
function props(overrides: Partial<Parameters<typeof WagerTransaction.create>[0]> = {}) {
  return {
    id: "transaction-1", providerId: "provider-1", externalTransactionId: "external-1",
    idempotencyKey: "provider-1:external-1", payloadHash: "hash",
    walletId: "wallet-1", playerId: "player-1", roundId: "round-1",
    gameId: "game-1", kind: WagerTransactionKind.Bet, money: money("10.00"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"), ...overrides,
  };
}
