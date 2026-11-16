import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { MikroORM } from "@mikro-orm/postgresql";
import mikroOrmConfig from "../../../../src/database/mikro-orm.config";
import { LedgerDirection, WalletLedgerEntry } from "../../../../src/domain/ledger-entry";
import { Money } from "../../../../src/domain/value-objects/money";
import { Wallet } from "../../../../src/domain/wallet";
import { WagerTransaction } from "../../../../src/domain/wager-transaction";
import { WagerTransactionKind } from "../../../../src/domain/wager-transaction.types";
import { WalletEntity } from "../../../../src/database/entities/wallet.entity";
import { WagerTransactionEntity } from "../../../../src/database/entities/wager-transaction.entity";
import { WalletLedgerEntryEntity } from "../../../../src/database/entities/wallet-ledger-entry.entity";
import { MikroOrmWalletRepository } from "../../../../src/database/repositories/mikro-orm-wallet.repository";
import { MikroOrmWagerTransactionRepository } from "../../../../src/database/repositories/mikro-orm-wager-transaction.repository";
import { MikroOrmLedgerRepository } from "../../../../src/database/repositories/mikro-orm-ledger.repository";

const walletId = "55555555-5555-4555-8555-555555555555";
const transactionId = "66666666-6666-4666-8666-666666666666";
const entryId = "77777777-7777-4777-8777-777777777777";
let orm: MikroORM;
let repository: MikroOrmLedgerRepository;

beforeAll(async () => {
  orm = await MikroORM.init(mikroOrmConfig);
  const em = orm.em.fork();
  await new MikroOrmWalletRepository(em).save(Wallet.open({
    id: walletId, playerId: "ledger-player",
    initialBalance: Money.zero("BRL"),
  }));
  await new MikroOrmWagerTransactionRepository(em).save(WagerTransaction.create({
    id: transactionId, providerId: "provider-ledger",
    externalTransactionId: "external-ledger", idempotencyKey: "key-ledger",
    payloadHash: "hash-ledger", walletId, playerId: "ledger-player",
    roundId: "round-ledger", gameId: "game-ledger", kind: WagerTransactionKind.Bet,
    money: Money.from({ amount: "25.00", currency: "BRL" }), createdAt: new Date(),
  }));
  repository = new MikroOrmLedgerRepository(em);
});

afterAll(async () => {
  const em = orm.em.fork();
  await em.nativeDelete(WalletLedgerEntryEntity, { id: entryId });
  await em.nativeDelete(WagerTransactionEntity, { id: transactionId });
  await em.nativeDelete(WalletEntity, { id: walletId });
  await orm.close(true);
});

describe("MikroOrmLedgerRepository", () => {
  test("appends and retrieves entries by wallet", async () => {
    await repository.append(WalletLedgerEntry.create({
      id: entryId, walletId, transactionId, direction: LedgerDirection.Debit,
      money: Money.from({ amount: "25.00", currency: "BRL" }),
      balanceBefore: Money.from({ amount: "25.00", currency: "BRL" }),
      balanceAfter: Money.zero("BRL"), createdAt: new Date(),
    }));

    const entries = await repository.findByWalletId(walletId);

    expect(entries).toHaveLength(1);
    expect(entries[0].isBalanced()).toBe(true);
    expect(entries[0].money.toString()).toBe("25.00");
  });
});
