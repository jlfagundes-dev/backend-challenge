import { IntegrationEvent } from "./events/integration-event";

export interface OutboxMessageState {
  id: string;
  aggregateId: string;
  eventType: string;
  payload: Readonly<Record<string, unknown>>;
  occurredAt: Date;
  attempts: number;
  nextAttemptAt?: Date;
  publishedAt?: Date;
}

export class OutboxMessage {
  private constructor(
    public readonly id: string,
    public readonly aggregateId: string,
    public readonly eventType: string,
    public readonly payload: Readonly<Record<string, unknown>>,
    public readonly occurredAt: Date,
    private _attempts: number,
    private _nextAttemptAt?: Date,
    private _publishedAt?: Date,
  ) {}

  static enqueue(event: IntegrationEvent<unknown>): OutboxMessage {
    const serialized = event.toJSON();
    const payload: Readonly<Record<string, unknown>> = {
      eventId: serialized.eventId,
      eventType: serialized.eventType,
      aggregateId: serialized.aggregateId,
      correlationId: serialized.correlationId,
      causationId: serialized.causationId,
      occurredAt: serialized.occurredAt,
      version: serialized.version,
      data: serialized.data,
    };
    return new OutboxMessage(
      event.eventId,
      event.aggregateId,
      event.eventType,
      payload,
      event.occurredAt,
      0,
    );
  }

  static rehydrate(state: OutboxMessageState): OutboxMessage {
    return new OutboxMessage(
      state.id,
      state.aggregateId,
      state.eventType,
      state.payload,
      state.occurredAt,
      state.attempts,
      state.nextAttemptAt,
      state.publishedAt,
    );
  }

  get attempts(): number { return this._attempts; }
  get nextAttemptAt(): Date | undefined { return this._nextAttemptAt; }
  get publishedAt(): Date | undefined { return this._publishedAt; }

  isPending(): boolean {
    return this._publishedAt === undefined;
  }

  isDue(now: Date): boolean {
    return this.isPending() &&
      (this._nextAttemptAt === undefined || this._nextAttemptAt <= now);
  }

  markPublished(at: Date): void {
    if (!this.isPending()) throw new Error("A mensagem Outbox já foi publicada");
    this._publishedAt = at;
  }

  scheduleRetry(now: Date): void {
    if (!this.isPending()) throw new Error("A mensagem Outbox já foi publicada");
    this._attempts += 1;
    const delay = Math.min(1000 * 2 ** (this._attempts - 1), 300000);
    this._nextAttemptAt = new Date(now.getTime() + delay);
  }
}
