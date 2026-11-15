import { describe, expect, test } from "bun:test";
import { LedgerDirection, WalletLedgerEntry } from "../../../../src/domain/ledger-entry";
import { Money } from "../../../../src/domain/value-objects/money";
import { WalletLedgerEntryEntity } from "../../../../src/database/entities/wallet-ledger-entry.entity";
import { WalletLedgerEntryMapper } from "../../../../src/database/mappers/wallet-ledger-entry.mapper";

const createdAt = new Date("2026-01-01T00:00:00.000Z");

describe("WalletLedgerEntryMapper", () => {
  test("converts an entity to the domain", () => {
    const entity = new WalletLedgerEntryEntity();
    Object.assign(entity, {
      id: "entry-1", walletId: "wallet-1", transactionId: "transaction-1",
      direction: LedgerDirection.Debit, amount: "25.00", currency: "BRL",
      balanceBefore: "100.00", balanceAfter: "75.00", createdAt,
    });

    const entry = WalletLedgerEntryMapper.toDomain(entity);

    expect(entry.money.toString()).toBe("25.00");
    expect(entry.balanceAfter.toString()).toBe("75.00");
    expect(entry.isBalanced()).toBe(true);
  });

  test("converts a domain entry to an entity", () => {
    const entry = WalletLedgerEntry.create({
      id: "entry-1", walletId: "wallet-1", transactionId: "transaction-1",
      direction: LedgerDirection.Credit,
      money: Money.from({ amount: "25.00", currency: "BRL" }),
      balanceBefore: Money.from({ amount: "75.00", currency: "BRL" }),
      balanceAfter: Money.from({ amount: "100.00", currency: "BRL" }),
      createdAt,
    });

    const entity = WalletLedgerEntryMapper.toEntity(entry);

    expect(entity.amount).toBe("25.00");
    expect(entity.balanceBefore).toBe("75.00");
    expect(entity.direction).toBe(LedgerDirection.Credit);
  });
});
