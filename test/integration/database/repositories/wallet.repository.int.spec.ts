import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MikroORM } from "@mikro-orm/postgresql";
import mikroOrmConfig from "../../../../src/database/mikro-orm.config";
import { Wallet } from "../../../../src/domain/wallet";
import { Money } from "../../../../src/domain/value-objects/money";
import { WalletEntity } from "../../../../src/database/entities/wallet.entity";
import { MikroOrmWalletRepository } from "../../../../src/database/repositories/mikro-orm-wallet.repository";

const walletId = "11111111-1111-4111-8111-111111111111";
const duplicateId = "22222222-2222-4222-8222-222222222222";
let orm: MikroORM;
let repository: MikroOrmWalletRepository;

beforeAll(async () => {
  orm = await MikroORM.init(mikroOrmConfig);
  repository = new MikroOrmWalletRepository(orm.em.fork());
});

afterAll(async () => {
  await orm.em.fork().nativeDelete(WalletEntity, {
    id: { $in: [walletId, duplicateId] },
  });
  await orm.close(true);
});

describe("MikroOrmWalletRepository", () => {
  test("persists and retrieves a wallet from PostgreSQL", async () => {
    const wallet = Wallet.open({
      id: walletId,
      playerId: "integration-player",
      initialBalance: Money.from({ amount: "100.00", currency: "BRL" }),
    });

    await repository.save(wallet);
    const found = await repository.findById(walletId);

    expect(found?.balance.toString()).toBe("100.00");
    expect(found?.playerId).toBe("integration-player");
  });

  test("finds a wallet by player and currency", async () => {
    const found = await repository.findByPlayerAndCurrency(
      "integration-player",
      "BRL",
    );

    expect(found?.id).toBe(walletId);
  });

  test("persists a changed balance", async () => {
    const wallet = await repository.findById(walletId);
    if (!wallet) throw new Error("Wallet de integração não encontrada");

    wallet.credit(Money.from({ amount: "25.00", currency: "BRL" }));
    await repository.save(wallet);
    const found = await repository.findById(walletId);

    expect(found?.balance.toString()).toBe("125.00");
    expect(found?.version).toBe(2);
  });

  test("enforces player and currency uniqueness in PostgreSQL", async () => {
    const duplicate = Wallet.open({
      id: duplicateId,
      playerId: "integration-player",
      initialBalance: Money.zero("BRL"),
    });

    expect(repository.save(duplicate)).rejects.toThrow();
  });
});
