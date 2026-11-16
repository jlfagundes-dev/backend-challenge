import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MikroORM } from "@mikro-orm/postgresql";
import mikroOrmConfig from "../../../../src/database/mikro-orm.config";
import { OutboxMessage } from "../../../../src/domain/outbox-message";
import { OutboxMessageEntity } from "../../../../src/database/entities/outbox-message.entity";
import { MikroOrmOutboxRepository } from "../../../../src/database/repositories/mikro-orm-outbox.repository";

const messageId = "88888888-8888-4888-8888-888888888888";
let orm: MikroORM;
let repository: MikroOrmOutboxRepository;

beforeAll(async () => {
  orm = await MikroORM.init(mikroOrmConfig);
  repository = new MikroOrmOutboxRepository(orm.em.fork());
});

afterAll(async () => {
  await orm.em.fork().nativeDelete(OutboxMessageEntity, { id: messageId });
  await orm.close(true);
});

describe("MikroOrmOutboxRepository", () => {
  test("enqueues, claims and saves a pending message", async () => {
    const message = OutboxMessage.rehydrate({
      id: messageId, aggregateId: "aggregate-1", eventType: "TestEvent",
      payload: { eventId: "event-1" }, occurredAt: new Date(), attempts: 0,
    });

    await repository.enqueue(message);
    await orm.em.fork().transactional(async (em) => {
      const transactionalRepository = new MikroOrmOutboxRepository(em);
      const claimed = await transactionalRepository.claimDue(new Date(), 10);
      // Marca a mensagem como publicada sem assumir que não há outras pendentes.
      const claimedMessage = claimed.find((item) => item.id === messageId);
      expect(claimedMessage).toBeDefined();
      claimedMessage?.markPublished(new Date());
      if (claimedMessage) await transactionalRepository.save(claimedMessage);
    });
    const remaining = await orm.em.fork().transactional((em) =>
      new MikroOrmOutboxRepository(em).claimDue(new Date(), 10),
    );
    expect(remaining.some((item) => item.id === messageId)).toBe(false);
  });
});
