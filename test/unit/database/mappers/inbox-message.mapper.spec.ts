import { describe, expect, test } from "bun:test";
import { InboxMessage } from "../../../../src/domain/inbox-message";
import { InboxMessageEntity } from "../../../../src/database/entities/inbox-message.entity";
import { InboxMessageMapper } from "../../../../src/database/mappers/inbox-message.mapper";

const receivedAt = new Date("2026-01-01T00:00:00.000Z");
const message = InboxMessage.receive({
  messageId: "message-1",
  consumerName: "wager-consumer",
  payloadHash: "hash-1",
  receivedAt,
});

describe("InboxMessageMapper", () => {
  test("converts an entity to the domain", () => {
    const entity = Object.assign(new InboxMessageEntity(), {
      messageId: "message-1", consumerName: "wager-consumer",
      payloadHash: "hash-1", receivedAt, processedAt: undefined,
    });

    const result = InboxMessageMapper.toDomain(entity);

    expect(result.messageId).toBe("message-1");
    expect(result.isProcessed()).toBe(false);
  });

  test("converts a domain message to an entity", () => {
    const entity = InboxMessageMapper.toEntity(message);

    expect(entity.consumerName).toBe("wager-consumer");
    expect(entity.payloadHash).toBe("hash-1");
    expect(entity.processedAt).toBeUndefined();
  });
});
