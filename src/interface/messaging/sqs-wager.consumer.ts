import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ProcessWagerTransactionUseCase } from "../../application/process-wager-transaction.use-case";
import type { ProcessWagerTransactionInput } from "../../application/process-wager-transaction.use-case";
import { APPLICATION_TOKENS } from "../../application/tokens";
import { InboxMessage } from "../../domain/inbox-message";
import type { InboxRepository } from "../../domain/ports/inbox-repository.port";
import type { UnitOfWork } from "../../domain/ports/unit-of-work.port";
import { hashPayload } from "../http/canonical-payload";

interface WagerTransactionRequested {
  messageId?: string;
  data: Omit<ProcessWagerTransactionInput, "id" | "payloadHash"> & { id?: string };
}

@Injectable()
export class SqsWagerConsumer {
  private readonly client = new SQSClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint: process.env.SQS_ENDPOINT ?? "http://localhost:4566",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
    },
  });
  private readonly queueUrl = process.env.WAGER_QUEUE_URL
    ?? "http://localhost:4566/000000000000/wager-transactions.fifo";
  private readonly consumerName = "wager-transaction-consumer";

  constructor(
    private readonly processTransaction: ProcessWagerTransactionUseCase,
    @Inject(APPLICATION_TOKENS.inboxRepository) private readonly inbox: InboxRepository,
    @Inject(APPLICATION_TOKENS.unitOfWork) private readonly unitOfWork: UnitOfWork,
  ) {}

  async pollOnce(): Promise<void> {
    const response = await this.client.send(new ReceiveMessageCommand({
      QueueUrl: this.queueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 10,
    }));
    for (const message of response.Messages ?? []) {
      await this.processMessage(message.Body ?? "", message.MessageId ?? randomUUID());
      if (message.ReceiptHandle) {
        await this.client.send(new DeleteMessageCommand({
          QueueUrl: this.queueUrl, ReceiptHandle: message.ReceiptHandle,
        }));
      }
    }
  }

  private async processMessage(body: string, brokerMessageId: string): Promise<void> {
    const envelope = JSON.parse(body) as WagerTransactionRequested;
    const messageId = envelope.messageId ?? brokerMessageId;
    await this.unitOfWork.execute(async () => {
      const existing = await this.inbox.findByConsumerAndMessage(this.consumerName, messageId);
      if (existing?.isProcessed()) return;
      const received = existing ?? InboxMessage.receive({
        messageId, consumerName: this.consumerName,
        payloadHash: hashPayload(envelope.data), receivedAt: new Date(),
      });
      await this.processTransaction.execute({
        ...envelope.data,
        id: envelope.data.id ?? randomUUID(),
        payloadHash: hashPayload(envelope.data),
      });
      received.markProcessed(new Date());
      await this.inbox.save(received);
    });
  }
}
