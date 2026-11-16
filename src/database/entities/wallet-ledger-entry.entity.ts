import {
  Entity,
  Index,
  PrimaryKey,
  Property,
  Unique,
} from "@mikro-orm/decorators/legacy";
import { LedgerDirection } from "../../domain/ledger-entry";

@Entity({ tableName: "wallet_ledger_entries" })
@Unique({
  name: "wallet_ledger_entries_transaction_wallet_unique",
  properties: ["transactionId", "walletId"],
})
export class WalletLedgerEntryEntity {
  @PrimaryKey({ type: "uuid" })
  id!: string;

  @Index()
  @Property({ type: "uuid" })
  walletId!: string;

  @Property({ type: "uuid" })
  transactionId!: string;

  @Property({ type: "string" })
  direction!: LedgerDirection;

  @Property({ type: "numeric", precision: 18, scale: 2 })
  amount!: string;

  @Property({ type: "char", length: 3 })
  currency!: string;

  @Property({ type: "numeric", precision: 18, scale: 2 })
  balanceBefore!: string;

  @Property({ type: "numeric", precision: 18, scale: 2 })
  balanceAfter!: string;

  @Property({ type: "datetime" })
  createdAt!: Date;
}
