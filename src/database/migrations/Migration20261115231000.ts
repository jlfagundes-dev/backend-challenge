import { Migration } from "@mikro-orm/migrations";

export class Migration20261115231000 extends Migration {
  override name = "Migration20261115231000";

  override up(): void | Promise<void> {
    this.addSql(`create table "inbox_messages" ("message_id" varchar(255) not null, "consumer_name" varchar(255) not null, "payload_hash" varchar(255) not null, "received_at" timestamptz not null, "processed_at" timestamptz null, primary key ("message_id", "consumer_name"));`);
    this.addSql(`create index "inbox_messages_processed_at_index" on "inbox_messages" ("processed_at");`);
    this.addSql(`alter table "inbox_messages" add constraint "inbox_messages_message_id_not_empty" check (char_length("message_id") > 0);`);
    this.addSql(`alter table "inbox_messages" add constraint "inbox_messages_consumer_name_not_empty" check (char_length("consumer_name") > 0);`);
    this.addSql(`alter table "inbox_messages" add constraint "inbox_messages_payload_hash_not_empty" check (char_length("payload_hash") > 0);`);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "inbox_messages" cascade;`);
  }
}
