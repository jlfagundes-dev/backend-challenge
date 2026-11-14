import { describe, expect, test } from "bun:test";
import { LedgerDirection, WalletLedgerEntry } from "../../../src/domain/ledger-entry";
import { Money } from "../../../src/domain/value-objects/money";

const date = new Date("2026-01-01T00:00:00.000Z");

describe("WalletLedgerEntry", () => {
  test("creates a balanced debit entry", () => {
    const entry = WalletLedgerEntry.create({
      id: "entry-1",
      walletId: "wallet-1",
      transactionId: "transaction-1",
      direction: LedgerDirection.Debit,
      money: money("30.00"),
      balanceBefore: money("100.00"),
      balanceAfter: money("70.00"),
      createdAt: date,
    });

    expect(entry.isBalanced()).toBe(true);
  });

  test("creates a balanced credit entry", () => {
    const entry = WalletLedgerEntry.create({
      id: "entry-1",
      walletId: "wallet-1",
      transactionId: "transaction-1",
      direction: LedgerDirection.Credit,
      money: money("30.00"),
      balanceBefore: money("70.00"),
      balanceAfter: money("100.00"),
      createdAt: date,
    });

    expect(entry.isBalanced()).toBe(true);
  });

  test("rejects an inconsistent balance", () => {
    expect(() =>
      WalletLedgerEntry.create({
        id: "entry-1",
        walletId: "wallet-1",
        transactionId: "transaction-1",
        direction: LedgerDirection.Debit,
        money: money("30.00"),
        balanceBefore: money("100.00"),
        balanceAfter: money("80.00"),
        createdAt: date,
      }),
    ).toThrow("O lançamento do Ledger está inconsistente");
  });

  test("rehydrates persisted state without transition validation", () => {
    const entry = WalletLedgerEntry.rehydrate({
      id: "entry-1",
      walletId: "wallet-1",
      transactionId: "transaction-1",
      direction: LedgerDirection.Debit,
      money: money("30.00"),
      balanceBefore: money("100.00"),
      balanceAfter: money("80.00"),
      createdAt: date,
    });

    expect(entry.isBalanced()).toBe(false);
  });
});

function money(amount: string): Money {
  return Money.from({ amount, currency: "BRL" });
}
