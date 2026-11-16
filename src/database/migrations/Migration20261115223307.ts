import { Migration } from '@mikro-orm/migrations';

export class Migration20261115223307 extends Migration {

  override name = 'Migration20261115223307';

  override up(): void | Promise<void> {
    this.addSql(`create table "wager_transactions" ("id" uuid not null, "provider_id" varchar(255) not null, "external_transaction_id" varchar(255) not null, "idempotency_key" varchar(255) not null, "payload_hash" varchar(255) not null, "wallet_id" uuid not null, "player_id" varchar(255) not null, "round_id" varchar(255) not null, "game_id" varchar(255) not null, "kind" varchar(255) not null, "amount" numeric(18,2) not null, "currency" char(3) not null, "status" varchar(255) not null, "reference_external_transaction_id" varchar(255) null, "reference_transaction_id" uuid null, "failure_code" varchar(255) null, "processed_at" timestamptz null, "created_at" timestamptz not null, primary key ("id"));`);
    this.addSql(`create index "wager_transactions_wallet_id_index" on "wager_transactions" ("wallet_id");`);
    this.addSql(`create index "wager_transactions_reference_external_transaction_id_index" on "wager_transactions" ("reference_external_transaction_id");`);
    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_provider_external_unique" unique ("provider_id", "external_transaction_id");`);
    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_idempotency_unique" unique ("idempotency_key");`);
    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_wallet_fk" foreign key ("wallet_id") references "wallets" ("id") on update cascade;`);
    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_amount_non_negative" check ("amount" >= 0);`);
    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_currency_iso" check ("currency" ~ '^[A-Z]{3}$');`);
    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_kind_valid" check ("kind" in ('OPENING', 'BET', 'WIN', 'LOSS', 'REFUND', 'ROLLBACK'));`);
    this.addSql(`alter table "wager_transactions" add constraint "wager_transactions_status_valid" check ("status" in ('PENDING', 'PENDING_REFERENCE', 'PROCESSED', 'REJECTED', 'FAILED'));`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "wager_transactions" cascade;`);
  }

}
