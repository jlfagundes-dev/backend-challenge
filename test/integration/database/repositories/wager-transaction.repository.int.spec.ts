import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MikroORM } from "@mikro-orm/postgresql";
import mikroOrmConfig from "../../../../src/database/mikro-orm.config";
import { Money } from "../../../../src/domain/value-objects/money";
import { WagerTransaction } from "../../../../src/domain/wager-transaction";
import { WagerTransactionKind } from "../../../../src/domain/wager-transaction.types";
import { Wallet } from "../../../../src/domain/wallet";
import { WalletEntity } from "../../../../src/database/entities/wallet.entity";
import { WagerTransactionEntity } from "../../../../src/database/entities/wager-transaction.entity";
import { MikroOrmWalletRepository } from "../../../../src/database/repositories/mikro-orm-wallet.repository";
import { MikroOrmWagerTransactionRepository } from "../../../../src/database/repositories/mikro-orm-wager-transaction.repository";

const walletId = "33333333-3333-4333-8333-333333333333";
const transactionId = "44444444-4444-4444-8444-444444444444";
let orm: MikroORM;
let repository: MikroOrmWagerTransactionRepository;

beforeAll(async () => {
  orm = await MikroORM.init(mikroOrmConfig);
  const em = orm.em.fork();
  await new MikroOrmWalletRepository(em).save(Wallet.open({
    id: walletId, playerId: "transaction-player",
    initialBalance: Money.zero("BRL"),
  }));
  repository = new MikroOrmWagerTransactionRepository(em);
});

afterAll(async () => {
  const em = orm.em.fork();
  await em.nativeDelete(WagerTransactionEntity, { id: transactionId });
  await em.nativeDelete(WalletEntity, { id: walletId });
  await orm.close(true);
});

describe("MikroOrmWagerTransactionRepository", () => {
  test("persists and finds a transaction by its identifiers", async () => {
    const transaction = WagerTransaction.create({
      id: transactionId, providerId: "provider-a",
      externalTransactionId: "external-1", idempotencyKey: "key-1",
      payloadHash: "hash-1", walletId, playerId: "transaction-player",
      roundId: "round-1", gameId: "game-1", kind: WagerTransactionKind.Bet,
      money: Money.from({ amount: "25.00", currency: "BRL" }),
      createdAt: new Date(),
    });

    await repository.save(transaction);

    expect((await repository.findById(transactionId))?.money.toString()).toBe("25.00");
    expect((await repository.findByIdempotencyKey("key-1"))?.id).toBe(transactionId);
    expect((await repository.findByProviderAndExternalId("provider-a", "external-1"))?.id)
      .toBe(transactionId);
  });

  test("persists a transaction state transition", async () => {
    const transaction = await repository.findById(transactionId);
    if (!transaction) throw new Error("Transação de integração não encontrada");

    transaction.markProcessed(undefined, new Date());
    await repository.save(transaction);

    expect((await repository.findById(transactionId))?.status).toBe("PROCESSED");
  });
});
