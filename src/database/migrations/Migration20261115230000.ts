import { Migration } from "@mikro-orm/migrations";

export class Migration20261115230000 extends Migration {
  override name = "Migration20261115230000";

  override up(): void | Promise<void> {
    this.addSql(`create table "outbox_messages" ("id" uuid not null, "aggregate_id" varchar(255) not null, "event_type" varchar(255) not null, "payload" jsonb not null, "occurred_at" timestamptz not null, "attempts" int not null, "next_attempt_at" timestamptz null, "published_at" timestamptz null, primary key ("id"));`);
    this.addSql(`create index "outbox_messages_aggregate_id_index" on "outbox_messages" ("aggregate_id");`);
    this.addSql(`create index "outbox_messages_next_attempt_at_index" on "outbox_messages" ("next_attempt_at");`);
    this.addSql(`create index "outbox_messages_published_at_index" on "outbox_messages" ("published_at");`);
    this.addSql(`create index "outbox_messages_pending_due_index" on "outbox_messages" ("published_at", "next_attempt_at");`);
    this.addSql(`alter table "outbox_messages" add constraint "outbox_messages_aggregate_id_not_empty" check (char_length("aggregate_id") > 0);`);
    this.addSql(`alter table "outbox_messages" add constraint "outbox_messages_event_type_not_empty" check (char_length("event_type") > 0);`);
    this.addSql(`alter table "outbox_messages" add constraint "outbox_messages_attempts_non_negative" check ("attempts" >= 0);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "outbox_messages" cascade;`);
  }
}
