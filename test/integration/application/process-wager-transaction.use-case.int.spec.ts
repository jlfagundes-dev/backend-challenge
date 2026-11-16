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
import {
  WagerTransactionKind,
  WagerTransactionStatus,
} from "../../../src/domain/wager-transaction.types";

const walletId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
let orm: MikroORM;
let processTransaction: ProcessWagerTransactionUseCase;

beforeAll(async () => {
  orm = await MikroORM.init(mikroOrmConfig);
  const em = orm.em.fork(); // Cria uma instancia do EntityManager para cada teste
  const wallets = new MikroOrmWalletRepository(em);
  // Cria instacias reais dos repositorios e casos de uso
  const transactions = new MikroOrmWagerTransactionRepository(em);
  const ledger = new MikroOrmLedgerRepository(em);
  const outbox = new MikroOrmOutboxRepository(em);
  const unitOfWork = new MikroOrmUnitOfWork(em);
  const createWallet = new CreateWalletUseCase(
    wallets, transactions, ledger, outbox, unitOfWork,
  );

  // Cria o wallet inicial para os testes
  await createWallet.execute({
    id: walletId, playerId: "bet-player",
    initialBalance: { amount: "100.00", currency: "BRL" },
  });
  processTransaction = new ProcessWagerTransactionUseCase(
    wallets, transactions, ledger, outbox, unitOfWork,
  );
});

afterAll(async () => {
  const em = orm.em.fork();
  await em.nativeDelete(OutboxMessageEntity, { aggregateId: walletId });
  await em.nativeDelete(WalletLedgerEntryEntity, { walletId });
  await em.nativeDelete(WagerTransactionEntity, { walletId });
  await em.nativeDelete(WalletEntity, { id: walletId });
  await orm.close(true);
});

const input = (id: string, key: string, amount: string) => ({
  id, providerId: "provider-bet", externalTransactionId: id,
  idempotencyKey: key, payloadHash: `hash-${key}`, walletId,
  playerId: "bet-player", roundId: "round-1", gameId: "game-1",
  kind: WagerTransactionKind.Bet,
  money: { amount, currency: "BRL" },
});

describe("ProcessWagerTransactionUseCase", () => {
  test("processes a BET with Ledger and Outbox", async () => {
    const result = await processTransaction.execute(input(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "bet-key-1", "80.00",
    ));

    expect(result.transaction.status).toBe(WagerTransactionStatus.Processed);
    expect(result.balance.toString()).toBe("20.00");
    expect((await processTransaction.execute(input(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "bet-key-1", "80.00",
    ))).idempotentReplay).toBe(true);
  });

  test("rejects a BET with insufficient funds without changing balance", async () => {
    const result = await processTransaction.execute(input(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc", "bet-key-2", "30.00",
    ));

    expect(result.transaction.status).toBe(WagerTransactionStatus.Rejected);
    expect(result.transaction.failureCode).toBe("INSUFFICIENT_FUNDS");
    expect(result.balance.toString()).toBe("20.00");
  });
});
