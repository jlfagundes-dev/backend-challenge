import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MikroORM } from "@mikro-orm/postgresql";
import mikroOrmConfig from "../../../../src/database/mikro-orm.config";
import { InboxMessage } from "../../../../src/domain/inbox-message";
import { InboxMessageEntity } from "../../../../src/database/entities/inbox-message.entity";
import { MikroOrmInboxRepository } from "../../../../src/database/repositories/mikro-orm-inbox.repository";

const messageId = "message-integration-1";
const consumerName = "integration-consumer";
let orm: MikroORM;
let repository: MikroOrmInboxRepository;

beforeAll(async () => {
  orm = await MikroORM.init(mikroOrmConfig);
  repository = new MikroOrmInboxRepository(orm.em.fork());
});

afterAll(async () => {
  await orm.em.fork().nativeDelete(InboxMessageEntity, { messageId, consumerName });
  await orm.close(true);
});

describe("MikroOrmInboxRepository", () => {
  test("persists, finds and updates a message", async () => {
    const message = InboxMessage.receive({
      messageId, consumerName, payloadHash: "hash-integration", receivedAt: new Date(),
    });
    await repository.save(message);

    const found = await repository.findByConsumerAndMessage(consumerName, messageId);
    expect(found?.isProcessed()).toBe(false);

    found?.markProcessed(new Date());
    if (!found) throw new Error("Mensagem Inbox não encontrada");
    await repository.save(found);

    expect((await repository.findByConsumerAndMessage(consumerName, messageId))?.isProcessed())
      .toBe(true);
  });
});
