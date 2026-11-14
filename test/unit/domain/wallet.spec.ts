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
  test("debits the balance and increments the version", () => {
    const wallet = createWallet("100.00");
    const change = wallet.debit(Money.from({ amount: "30.00", currency: "BRL" }));
    expect(change.before.toString()).toBe("100.00");
    expect(change.after.toString()).toBe("70.00");
    expect(wallet.balance.toString()).toBe("70.00");
    expect(wallet.version).toBe(2);
  });
  test("credits the balance and increments the version", () => {
    const wallet = createWallet("100.00");
    const change = wallet.credit(Money.from({ amount: "30.00", currency: "BRL" }));
    expect(change.before.toString()).toBe("100.00");
    expect(change.after.toString()).toBe("130.00");
    expect(wallet.balance.toString()).toBe("130.00");
    expect(wallet.version).toBe(2);
  });
  test("rejects a debit that exceeds the balance", () => {
    const wallet = createWallet("100.00");
    expect(() =>
      wallet.debit(Money.from({ amount: "100.01", currency: "BRL" })),
    ).toThrow("Saldo insuficiente para realizar o débito");
    expect(wallet.balance.toString()).toBe("100.00");
    expect(wallet.version).toBe(1);
  });
  test("rejects an operation with a different currency", () => {
    const wallet = createWallet("100.00");
    expect(() =>
      wallet.credit(Money.from({ amount: "10.00", currency: "USD" })),
    ).toThrow("A operação deve usar a mesma moeda da carteira");
  });
});
function createWallet(amount: string): Wallet {
  return Wallet.open({
    id: "wallet-1",
    playerId: "player-1",
    initialBalance: Money.from({ amount, currency: "BRL" }),
  });
}
