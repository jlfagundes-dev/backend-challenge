import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  CreateQueueCommand, ReceiveMessageCommand, SQSClient,
} from "@aws-sdk/client-sqs";
import { MikroORM } from "@mikro-orm/postgresql";
import mikroOrmConfig from "../../../src/database/mikro-orm.config";
import { MikroOrmUnitOfWork } from "../../../src/database/mikro-orm-unit-of-work";
import { MikroOrmOutboxRepository } from "../../../src/database/repositories/mikro-orm-outbox.repository";
import { OutboxMessageEntity } from "../../../src/database/entities/outbox-message.entity";
import { OutboxMessage } from "../../../src/domain/outbox-message";
import { SqsOutboxPublisher } from "../../../src/interface/messaging/sqs-outbox.publisher";

const queueUrl = "http://localhost:4566/000000000000/wager-events.fifo";
const messageId = "abababab-abab-4bab-8bab-abababababab";
const client = new SQSClient({
  region: "us-east-1", endpoint: "http://localhost:4566",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
});
let orm: MikroORM;

beforeAll(async () => {
  process.env.WAGER_EVENTS_QUEUE_URL = queueUrl;
  await client.send(new CreateQueueCommand({
    QueueName: "wager-events.fifo",
    Attributes: { FifoQueue: "true", ContentBasedDeduplication: "false" },
  }));
  orm = await MikroORM.init(mikroOrmConfig);
}, 30000);

afterAll(async () => {
  if (!orm) return;
  await orm.em.fork().nativeDelete(OutboxMessageEntity, { id: messageId });
  await orm.close(true);
});

describe("SqsOutboxPublisher", () => {
  test("publishes an Outbox message and marks it published", async () => {
    const em = orm.em.fork();
    const repository = new MikroOrmOutboxRepository(em);
    await repository.enqueue(OutboxMessage.rehydrate({
      id: messageId, aggregateId: "wallet-publisher",
      eventType: "WalletBalanceChanged", payload: { eventId: messageId },
      occurredAt: new Date(), attempts: 0,
    }));

    const publisher = new SqsOutboxPublisher(
      repository, new MikroOrmUnitOfWork(em),
    );
    expect(await publisher.publishOnce()).toBeGreaterThan(0);

    const response = await client.send(new ReceiveMessageCommand({
      QueueUrl: queueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 2,
    }));
    expect(response.Messages?.some((message) => message.Body?.includes(messageId))).toBe(true);
    const stored = await em.findOne(OutboxMessageEntity, { id: messageId });
    expect(stored?.publishedAt).toBeDefined();
  });
});
