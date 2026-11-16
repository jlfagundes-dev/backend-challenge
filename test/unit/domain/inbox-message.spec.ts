import { describe, expect, test } from "bun:test";
import { InboxMessage } from "../../../src/domain/inbox-message";

const receivedAt = new Date("2026-01-01T00:00:00.000Z");
const processedAt = new Date("2026-01-01T00:01:00.000Z");

function createMessage() {
  return InboxMessage.receive({
    messageId: "message-1",
    consumerName: "wager-consumer",
    payloadHash: "payload-hash",
    receivedAt,
  });
}

describe("InboxMessage", () => {
  test("receives a message as not processed", () => {
    const message = createMessage();

    expect(message.isProcessed()).toBe(false);
    expect(message.processedAt).toBeUndefined();
  });

  test("marks a message as processed once", () => {
    const message = createMessage();

    message.markProcessed(processedAt);

    expect(message.isProcessed()).toBe(true);
    expect(message.processedAt).toBe(processedAt);
  });

  test("does not allow processing the same message twice", () => {
    const message = createMessage();
    message.markProcessed(processedAt);

    expect(() => message.markProcessed(new Date())).toThrow(
      "A mensagem Inbox já foi processada",
    );
  });

  test("rehydrates a processed message", () => {
    const message = InboxMessage.rehydrate({
      messageId: "message-1",
      consumerName: "wager-consumer",
      payloadHash: "payload-hash",
      receivedAt,
      processedAt,
    });

    expect(message.isProcessed()).toBe(true);
    expect(message.processedAt).toBe(processedAt);
  });

  test("rejects missing message identity data", () => {
    expect(() =>
      InboxMessage.receive({
        messageId: "",
        consumerName: "wager-consumer",
        payloadHash: "payload-hash",
        receivedAt,
      }),
    ).toThrow("Os dados da mensagem Inbox são obrigatórios");
  });
});
