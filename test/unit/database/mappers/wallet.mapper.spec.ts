import { describe, expect, test } from "bun:test";
import { Wallet } from "../../../../src/domain/wallet";
import { WalletMapper } from "../../../../src/database/mappers/wallet.mapper";
import { WalletEntity } from "../../../../src/database/entities/wallet.entity";
import { Money } from "../../../../src/domain/value-objects/money";

const createdAt = new Date("2026-01-01T00:00:00.000Z");
const updatedAt = new Date("2026-01-02T00:00:00.000Z");

describe("WalletMapper", () => {
  test("converts an entity to the domain", () => {
    const entity = new WalletEntity();
    entity.id = "wallet-1";
    entity.playerId = "player-1";
    entity.currency = "BRL";
    entity.balance = "100.00";
    entity.version = 2;
    entity.createdAt = createdAt;
    entity.updatedAt = updatedAt;

    const wallet = WalletMapper.toDomain(entity);

    expect(wallet.balance.toString()).toBe("100.00");
    expect(wallet.currency).toBe("BRL");
    expect(wallet.version).toBe(2);
  });

  test("converts a domain wallet to an entity", () => {
    const wallet = Wallet.rehydrate({
      id: "wallet-1",
      playerId: "player-1",
      currency: "BRL",
      balance: Money.from({ amount: "75.50", currency: "BRL" }),
      version: 3,
      createdAt,
      updatedAt,
    });

    const entity = WalletMapper.toEntity(wallet);

    expect(entity.balance).toBe("75.50");
    expect(entity.playerId).toBe("player-1");
    expect(entity.version).toBe(3);
  });
});
