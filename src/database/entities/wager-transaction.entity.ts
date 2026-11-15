import {
  Entity,
  Index,
  PrimaryKey,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import { WagerTransactionKind, WagerTransactionStatus } from "../../domain/wager-transaction";

@Entity({ tableName: "wager_transactions" })
@Unique({
  name: "wager_transactions_idempotency_unique",
  properties: ["idempotencyKey"],
})
@Unique({
  name: "wager_transactions_provider_external_unique",
  properties: ["providerId", "externalTransactionId"],
})
export class WagerTransactionEntity {
  @PrimaryKey({ type: "uuid" })
  id!: string;

  @Property({ type: "string" })
  providerId!: string;

  @Property({ type: "string" })
  externalTransactionId!: string;

  @Property({ type: "string" })
  idempotencyKey!: string;

  @Property({ type: "string" })
  payloadHash!: string;

  @Index()
  @Property({ type: "uuid" })
  walletId!: string;

  @Property({ type: "string" })
  playerId!: string;

  @Property({ type: "string" })
  roundId!: string;

  @Property({ type: "string" })
  gameId!: string;

  @Property({ type: "string" })
  kind!: WagerTransactionKind;

  @Property({ type: "numeric", precision: 18, scale: 2 })
  amount!: string;

  @Property({ type: "char", length: 3 })
  currency!: string;

  @Property({ type: "string" })
  status!: WagerTransactionStatus;

  @Index()
  @Property({ type: "string", nullable: true })
  referenceExternalTransactionId?: string;

  @Property({ type: "uuid", nullable: true })
  referenceTransactionId?: string;

  @Property({ type: "string", nullable: true })
  failureCode?: string;

  @Property({ type: "datetime", nullable: true })
  processedAt?: Date;

  @Property({ type: "datetime" })
  createdAt!: Date;
}
