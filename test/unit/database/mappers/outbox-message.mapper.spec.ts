import { describe, expect, test } from "bun:test";
import { OutboxMessage } from "../../../../src/domain/outbox-message";
import { OutboxMessageEntity } from "../../../../src/database/entities/outbox-message.entity";
import { OutboxMessageMapper } from "../../../../src/database/mappers/outbox-message.mapper";

const occurredAt = new Date("2026-01-01T00:00:00.000Z");
const state = {
  id: "88888888-8888-4888-8888-888888888888",
  aggregateId: "aggregate-1",
  eventType: "TestEvent",
  payload: { eventId: "event-1", data: { value: "ok" } },
  occurredAt,
  attempts: 2,
};

describe("OutboxMessageMapper", () => {
  test("converts an entity to the domain", () => {
    const entity = Object.assign(new OutboxMessageEntity(), state);
    const message = OutboxMessageMapper.toDomain(entity);

    expect(message.id).toBe(state.id);
    expect(message.eventType).toBe("TestEvent");
    expect(message.attempts).toBe(2);
    expect(message.payload).toEqual(state.payload);
  });

  test("converts a domain message to an entity", () => {
    const message = OutboxMessage.rehydrate(state);
    const entity = OutboxMessageMapper.toEntity(message);

    expect(entity.aggregateId).toBe("aggregate-1");
    expect(entity.attempts).toBe(2);
    expect(entity.payload).toEqual(state.payload);
  });
});
