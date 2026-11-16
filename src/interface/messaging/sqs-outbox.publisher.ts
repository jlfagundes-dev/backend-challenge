import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Inject, Injectable } from "@nestjs/common";
import { APPLICATION_TOKENS } from "../../application/tokens";
import type { OutboxRepository } from "../../domain/ports/outbox-repository.port";
import type { UnitOfWork } from "../../domain/ports/unit-of-work.port";

@Injectable()
export class SqsOutboxPublisher {
  private readonly client = new SQSClient({
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint: process.env.SQS_ENDPOINT ?? "http://localhost:4566",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test",
    },
  });
  private readonly queueUrl = process.env.WAGER_EVENTS_QUEUE_URL
    ?? "http://localhost:4566/000000000000/wager-events.fifo";

  constructor(
    @Inject(APPLICATION_TOKENS.outboxRepository) private readonly outbox: OutboxRepository,
    @Inject(APPLICATION_TOKENS.unitOfWork) private readonly unitOfWork: UnitOfWork,
  ) {}

  async publishOnce(limit = 10): Promise<number> {
    let published = 0;
    await this.unitOfWork.execute(async () => {
      const messages = await this.outbox.claimDue(new Date(), limit);
      for (const message of messages) {
        await this.client.send(new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify(message.payload),
          MessageGroupId: message.aggregateId,
          MessageDeduplicationId: message.id,
        }));
        message.markPublished(new Date());
        await this.outbox.save(message);
        published += 1;
      }
    });
    return published;
  }
}
