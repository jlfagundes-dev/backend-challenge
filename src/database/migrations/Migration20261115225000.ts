import { Migration } from "@mikro-orm/migrations";

export class Migration20261115225000 extends Migration {
  override name = "Migration20261115225000";

  override up(): void | Promise<void> {
    this.addSql(`create table "wallet_ledger_entries" ("id" uuid not null, "wallet_id" uuid not null, "transaction_id" uuid not null, "direction" varchar(255) not null, "amount" numeric(18,2) not null, "currency" char(3) not null, "balance_before" numeric(18,2) not null, "balance_after" numeric(18,2) not null, "created_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`create index "wallet_ledger_entries_wallet_id_index" on "wallet_ledger_entries" ("wallet_id");`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "wallet_ledger_entries_transaction_wallet_unique" unique ("transaction_id", "wallet_id");`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "wallet_ledger_entries_wallet_fk" foreign key ("wallet_id") references "wallets" ("id") on update cascade;`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "wallet_ledger_entries_transaction_fk" foreign key ("transaction_id") references "wager_transactions" ("id") on update cascade;`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "wallet_ledger_entries_amount_positive" check ("amount" > 0);`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "wallet_ledger_entries_balances_non_negative" check ("balance_before" >= 0 and "balance_after" >= 0);`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "wallet_ledger_entries_currency_iso" check ("currency" ~ '^[A-Z]{3}$');`);
    this.addSql(`alter table "wallet_ledger_entries" add constraint "wallet_ledger_entries_direction_valid" check ("direction" in ('DEBIT', 'CREDIT'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "wallet_ledger_entries" cascade;`);
  }
}
