import {
  Entity,
  Index,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";

@Entity({ tableName: "outbox_messages" })
export class OutboxMessageEntity {
  @PrimaryKey({ type: "uuid" })
  id!: string;

  @Index()
  @Property({ type: "string" })
  aggregateId!: string;

  @Property({ type: "string" })
  eventType!: string;

  @Property({ type: "json" })
  payload!: Record<string, unknown>;

  @Property({ type: "datetime" })
  occurredAt!: Date;

  @Property({ type: "integer" })
  attempts!: number;

  @Index()
  @Property({ type: "datetime", nullable: true })
  nextAttemptAt?: Date;

  @Index()
  @Property({ type: "datetime", nullable: true })
  publishedAt?: Date;
}
