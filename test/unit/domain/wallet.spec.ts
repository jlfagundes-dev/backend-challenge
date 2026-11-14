import { describe, expect, test } from "bun:test";
import { Wallet } from "../../../src/domain/wallet";
import { Money } from "../../../src/domain/value-objects/money";

describe("Wallet", () => {
  test("opens with the initial balance and version one", () => {
    const balance = Money.from({ amount: "100.00", currency: "BRL" });
    const wallet = Wallet.open({
      id: "wallet-1",
      playerId: "player-1",
      initialBalance: balance,
    });

    expect(wallet.id).toBe("wallet-1");
    expect(wallet.playerId).toBe("player-1");
    expect(wallet.currency).toBe("BRL");
    expect(wallet.balance).toBe(balance);
    expect(wallet.version).toBe(1);
    expect(wallet.createdAt).toBeInstanceOf(Date);
    expect(wallet.updatedAt).toBeInstanceOf(Date);
  });

  test("rehydrates persisted state without changing it", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");
    const balance = Money.from({ amount: "75.00", currency: "BRL" });

    const wallet = Wallet.rehydrate({
      id: "wallet-1",
      playerId: "player-1",
      currency: "BRL",
      balance,
      version: 3,
      createdAt,
      updatedAt,
    });

    expect(wallet.balance).toBe(balance);
    expect(wallet.version).toBe(3);
    expect(wallet.createdAt).toBe(createdAt);
    expect(wallet.updatedAt).toBe(updatedAt);
  });

  test("rejects a negative initial balance", () => {
    const negativeBalance = Money.from({
      amount: "10.00",
      currency: "BRL",
    }).negate();

    expect(() =>
      Wallet.open({
        id: "wallet-1",
        playerId: "player-1",
        initialBalance: negativeBalance,
      }),
    ).toThrow("O saldo inicial da carteira não pode ser negativo");
  });
});
