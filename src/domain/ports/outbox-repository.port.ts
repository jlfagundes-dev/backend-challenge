import { OutboxMessage } from "../outbox-message";

export interface OutboxRepository {
  enqueue(message: OutboxMessage): Promise<void>;
  claimDue(now: Date, limit: number): Promise<OutboxMessage[]>; // Reivindicação de mensagens pendentes para publisher concorrente
  save(message: OutboxMessage): Promise<void>;
}
