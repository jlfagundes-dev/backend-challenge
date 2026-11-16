import {
  Entity,
  Index,
  PrimaryKey,
  Property,
} from "@mikro-orm/decorators/legacy";

@Entity({ tableName: "inbox_messages" })
export class InboxMessageEntity {
  @PrimaryKey({ type: "string" })
  messageId!: string;

  @PrimaryKey({ type: "string" })
  consumerName!: string;

  @Property({ type: "string" })
  payloadHash!: string;

  @Property({ type: "datetime" })
  receivedAt!: Date;

  @Index()
  @Property({ type: "datetime", nullable: true })
  processedAt?: Date;
}
