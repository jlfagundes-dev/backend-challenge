import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MikroORM } from "@mikro-orm/postgresql";
import mikroOrmConfig from "../../../src/database/mikro-orm.config";
import { CreateWalletUseCase } from "../../../src/application/create-wallet.use-case";
import {
  WagerTransactionKind,
  WagerTransactionStatus,
} from "../../../src/domain/wager-transaction.types";
import { MikroOrmUnitOfWork } from "../../../src/database/mikro-orm-unit-of-work";
import { MikroOrmWalletRepository } from "../../../src/database/repositories/mikro-orm-wallet.repository";
import { MikroOrmWagerTransactionRepository } from "../../../src/database/repositories/mikro-orm-wager-transaction.repository";
import { MikroOrmLedgerRepository } from "../../../src/database/repositories/mikro-orm-ledger.repository";
import { MikroOrmOutboxRepository } from "../../../src/database/repositories/mikro-orm-outbox.repository";
import { WalletEntity } from "../../../src/database/entities/wallet.entity";
import { WagerTransactionEntity } from "../../../src/database/entities/wager-transaction.entity";
import { WalletLedgerEntryEntity } from "../../../src/database/entities/wallet-ledger-entry.entity";
import { OutboxMessageEntity } from "../../../src/database/entities/outbox-message.entity";

const walletId = "99999999-9999-4999-8999-999999999999";
let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init(mikroOrmConfig);
});

afterAll(async () => {
  const em = orm.em.fork();
  await em.nativeDelete(OutboxMessageEntity, { aggregateId: walletId });
  await em.nativeDelete(WalletLedgerEntryEntity, { walletId });
  await em.nativeDelete(WagerTransactionEntity, { walletId });
  await em.nativeDelete(WalletEntity, { id: walletId });
  await orm.close(true);
});

describe("CreateWalletUseCase", () => {
  test("creates Wallet, OPENING, Ledger and Outbox atomically", async () => {
    const em = orm.em.fork();
    const useCase = new CreateWalletUseCase(
      new MikroOrmWalletRepository(em),
      new MikroOrmWagerTransactionRepository(em),
      new MikroOrmLedgerRepository(em),
      new MikroOrmOutboxRepository(em),
      new MikroOrmUnitOfWork(em),
    );

    const wallet = await useCase.execute({
      id: walletId,
      playerId: "opening-player",
      initialBalance: { amount: "100.00", currency: "BRL" },
    });
    const transaction = await em.findOne(WagerTransactionEntity, { walletId });
    const entries = await em.find(WalletLedgerEntryEntity, { walletId });
    const events = await em.find(OutboxMessageEntity, { aggregateId: walletId });

    expect(wallet.balance.toString()).toBe("100.00");
    expect(transaction?.kind).toBe(WagerTransactionKind.Opening);
    expect(transaction?.status).toBe(WagerTransactionStatus.Processed);
    expect(entries).toHaveLength(1);
    expect(events).toHaveLength(1);
  });
});
