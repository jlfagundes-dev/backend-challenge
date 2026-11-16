import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MikroORM } from "@mikro-orm/postgresql";
import mikroOrmConfig from "../../../src/database/mikro-orm.config";
import { CreateWalletUseCase } from "../../../src/application/create-wallet.use-case";
import { ProcessWagerTransactionUseCase } from "../../../src/application/process-wager-transaction.use-case";
import { MikroOrmUnitOfWork } from "../../../src/database/mikro-orm-unit-of-work";
import { MikroOrmWalletRepository } from "../../../src/database/repositories/mikro-orm-wallet.repository";
import { MikroOrmWagerTransactionRepository } from "../../../src/database/repositories/mikro-orm-wager-transaction.repository";
import { MikroOrmLedgerRepository } from "../../../src/database/repositories/mikro-orm-ledger.repository";
import { MikroOrmOutboxRepository } from "../../../src/database/repositories/mikro-orm-outbox.repository";
import { WalletEntity } from "../../../src/database/entities/wallet.entity";
import { WagerTransactionEntity } from "../../../src/database/entities/wager-transaction.entity";
import { WalletLedgerEntryEntity } from "../../../src/database/entities/wallet-ledger-entry.entity";
import { OutboxMessageEntity } from "../../../src/database/entities/outbox-message.entity";
import { WagerTransactionKind, WagerTransactionStatus } from "../../../src/domain/wager-transaction.types";

const walletRaceId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const walletReplayId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init(mikroOrmConfig);
  const em = orm.em.fork(); // Cria uma instancia para cada teste
  const dependencies = {
    wallets: new MikroOrmWalletRepository(em),
    transactions: new MikroOrmWagerTransactionRepository(em),
    ledger: new MikroOrmLedgerRepository(em),
    outbox: new MikroOrmOutboxRepository(em),
    unitOfWork: new MikroOrmUnitOfWork(em),
  };
  const createWallet = new CreateWalletUseCase(
    dependencies.wallets, dependencies.transactions, dependencies.ledger,
    dependencies.outbox, dependencies.unitOfWork,
  );
  await createWallet.execute({
    id: walletRaceId, playerId: "race-player",
    initialBalance: { amount: "100.00", currency: "BRL" },
  });
  await createWallet.execute({
    id: walletReplayId, playerId: "replay-player",
    initialBalance: { amount: "100.00", currency: "BRL" },
  });
});

afterAll(async () => {
  const em = orm.em.fork();
  for (const walletId of [walletRaceId, walletReplayId]) {
    await em.nativeDelete(OutboxMessageEntity, { aggregateId: walletId });
    await em.nativeDelete(WalletLedgerEntryEntity, { walletId });
    await em.nativeDelete(WagerTransactionEntity, { walletId });
    await em.nativeDelete(WalletEntity, { id: walletId });
  }
  await orm.close(true);
});

function processFor() {
  const em = orm.em.fork();
  return new ProcessWagerTransactionUseCase(
    new MikroOrmWalletRepository(em),
    new MikroOrmWagerTransactionRepository(em),
    new MikroOrmLedgerRepository(em),
    new MikroOrmOutboxRepository(em),
    new MikroOrmUnitOfWork(em),
  );
}

function bet(walletId: string, playerId: string, id: string, key: string, amount: string) {
  return {
    id, providerId: "concurrency-provider", externalTransactionId: id,
    idempotencyKey: key, payloadHash: `hash-${key}`, walletId, playerId,
    roundId: "concurrency-round", gameId: "concurrency-game",
    kind: WagerTransactionKind.Bet,
    money: { amount, currency: "BRL" },
  };
}

describe("Wager processing concurrency", () => {
  test("allows only one of two simultaneous bets that dispute the balance", async () => {
    const calls = [
      processFor().execute(bet(
        walletRaceId, "race-player", "f1111111-1111-4111-8111-111111111111", "race-key-1", "80.00",
      )),
      processFor().execute(bet(
        walletRaceId, "race-player", "f2222222-2222-4222-8222-222222222222", "race-key-2", "80.00",
      )),
    ];
    const results = await Promise.all(calls);
    const statuses = results.map((result) => result.transaction.status);
    const entries = await orm.em.fork().find(WalletLedgerEntryEntity, { walletId: walletRaceId });
    const wallet = await orm.em.fork().findOne(WalletEntity, { id: walletRaceId });

    expect(statuses.filter((status) => status === WagerTransactionStatus.Processed)).toHaveLength(1);
    expect(statuses.filter((status) => status === WagerTransactionStatus.Rejected)).toHaveLength(1);
    expect(wallet?.balance).toBe("20.00");
    expect(entries.filter((entry) => entry.direction === "DEBIT")).toHaveLength(1);
  });

  test("processes 50 duplicate deliveries as one debit", async () => {
    const calls = Array.from({ length: 50 }, (_, index) =>
      processFor().execute(bet(
        walletReplayId, "replay-player", `f${String(index + 300).padStart(7, "0")}-3000-4300-8300-000000000000`,
        "same-replay-key", "80.00",
      )),
    );
    const results = await Promise.all(calls);
    const entries = await orm.em.fork().find(WalletLedgerEntryEntity, { walletId: walletReplayId });
    const transactions = await orm.em.fork().find(WagerTransactionEntity, { walletId: walletReplayId });
    const wallet = await orm.em.fork().findOne(WalletEntity, { id: walletReplayId });

    expect(results.filter((result) => !result.idempotentReplay)).toHaveLength(1);
    expect(results.filter((result) => result.idempotentReplay)).toHaveLength(49);
    expect(transactions.filter((transaction) => transaction.kind === WagerTransactionKind.Bet)).toHaveLength(1);
    expect(entries.filter((entry) => entry.direction === "DEBIT")).toHaveLength(1);
    expect(wallet?.balance).toBe("20.00");
  });
});
