import { InboxMessage } from "../inbox-message";

export interface InboxRepository {
  findByConsumerAndMessage(
    consumerName: string,
    messageId: string,
  ): Promise<InboxMessage | null>;
  save(message: InboxMessage): Promise<void>;
}
