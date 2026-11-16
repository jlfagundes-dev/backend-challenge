import { Entity, PrimaryKey, Property, Unique } from "@mikro-orm/decorators/legacy";

@Entity({ tableName: "wallets" })
@Unique({
  name: "wallets_player_currency_unique",
  properties: ["playerId", "currency"],
})
export class WalletEntity {
  @PrimaryKey({ type: "uuid" })
  id!: string;

  @Property({ type: "string" })
  playerId!: string;

  @Property({ type: "char", length: 3 })
  currency!: string;

  @Property({ type: "numeric", precision: 18, scale: 2 })
  balance!: string;

  @Property({ type: "integer" })
  version!: number;

  @Property({ type: "datetime", onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ type: "datetime", onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt!: Date;
}
