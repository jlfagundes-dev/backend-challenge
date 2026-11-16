import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  SQSClient, SendMessageCommand,
} from "@aws-sdk/client-sqs";
import { MikroORM } from "@mikro-orm/postgresql";
import mikroOrmConfig from "../../../src/database/mikro-orm.config";
import { CreateWalletUseCase } from "../../../src/application/create-wallet.use-case";
import { ProcessWagerTransactionUseCase } from "../../../src/application/process-wager-transaction.use-case";
import { MikroOrmUnitOfWork } from "../../../src/database/mikro-orm-unit-of-work";
import { MikroOrmWalletRepository } from "../../../src/database/repositories/mikro-orm-wallet.repository";
import { MikroOrmWagerTransactionRepository } from "../../../src/database/repositories/mikro-orm-wager-transaction.repository";
import { MikroOrmLedgerRepository } from "../../../src/database/repositories/mikro-orm-ledger.repository";
import { MikroOrmOutboxRepository } from "../../../src/database/repositories/mikro-orm-outbox.repository";
import { MikroOrmInboxRepository } from "../../../src/database/repositories/mikro-orm-inbox.repository";
import { InboxMessageEntity } from "../../../src/database/entities/inbox-message.entity";
import { WalletEntity } from "../../../src/database/entities/wallet.entity";
import { WagerTransactionEntity } from "../../../src/database/entities/wager-transaction.entity";
import { WalletLedgerEntryEntity } from "../../../src/database/entities/wallet-ledger-entry.entity";
import { OutboxMessageEntity } from "../../../src/database/entities/outbox-message.entity";
import { SqsWagerConsumer } from "../../../src/interface/messaging/sqs-wager.consumer";

const queueUrl = "http://localhost:4566/000000000000/wager-transactions.fifo";
const walletId = "abababab-abab-4bab-8bab-abababababab";
const broker = new SQSClient({
  region: "us-east-1", endpoint: "http://localhost:4566",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
});
let orm: MikroORM;

beforeAll(async () => {
  process.env.WAGER_QUEUE_URL = queueUrl;
  orm = await MikroORM.init(mikroOrmConfig);
  const em = orm.em.fork();
  const wallets = new MikroOrmWalletRepository(em);
  const transactions = new MikroOrmWagerTransactionRepository(em);
  const ledger = new MikroOrmLedgerRepository(em);
  const outbox = new MikroOrmOutboxRepository(em);
  const uow = new MikroOrmUnitOfWork(em);
  await new CreateWalletUseCase(wallets, transactions, ledger, outbox, uow).execute({
    id: walletId, playerId: "sqs-player",
    initialBalance: { amount: "100.00", currency: "BRL" },
  });
});

afterAll(async () => {
  const em = orm.em.fork();
  await em.nativeDelete(InboxMessageEntity, { consumerName: "wager-transaction-consumer" });
  await em.nativeDelete(OutboxMessageEntity, { aggregateId: walletId });
  await em.nativeDelete(WalletLedgerEntryEntity, { walletId });
  await em.nativeDelete(WagerTransactionEntity, { walletId });
  await em.nativeDelete(WalletEntity, { id: walletId });
  await orm.close(true);
});

describe("SqsWagerConsumer", () => {
  test("processes and deduplicates messages through Inbox", async () => {
    const data = {
      providerId: "sqs-provider", externalTransactionId: "sqs-bet-1",
      idempotencyKey: "sqs-provider:sqs-bet-1", walletId, playerId: "sqs-player",
      roundId: "sqs-round", gameId: "sqs-game", kind: "BET",
      money: { amount: "80.00", currency: "BRL" },
    };
    const body = JSON.stringify({ messageId: "sqs-message-1", data });
    for (const deduplicationId of ["sqs-delivery-1", "sqs-delivery-2"]) {
      await broker.send(new SendMessageCommand({
        QueueUrl: queueUrl, MessageBody: body, MessageGroupId: "sqs-player",
        MessageDeduplicationId: deduplicationId,
      }));
    }

    const em = orm.em.fork();
    const consumer = new SqsWagerConsumer(
      new ProcessWagerTransactionUseCase(
        new MikroOrmWalletRepository(em),
        new MikroOrmWagerTransactionRepository(em),
        new MikroOrmLedgerRepository(em),
        new MikroOrmOutboxRepository(em),
        new MikroOrmUnitOfWork(em),
      ),
      new MikroOrmInboxRepository(em),
      new MikroOrmUnitOfWork(em),
    );
    await consumer.pollOnce();

    const wallet = await em.findOne(WalletEntity, { id: walletId });
    const inbox = await em.find(InboxMessageEntity, { messageId: "sqs-message-1" });
    expect(wallet?.balance).toBe("20.00");
    expect(inbox).toHaveLength(1);
    expect(inbox[0].processedAt).toBeDefined();
  });
});
