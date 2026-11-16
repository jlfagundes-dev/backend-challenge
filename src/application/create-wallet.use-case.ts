import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { WalletLedgerEntry, LedgerDirection } from "../domain/ledger-entry";
import { OutboxMessage } from "../domain/outbox-message";
import { WagerTransaction, WagerTransactionKind } from "../domain/wager-transaction";
import { WagerTransactionProcessed } from "../domain/events/wager-transaction-processed";
import type { LedgerRepository } from "../domain/ports/ledger-repository.port";
import type { OutboxRepository } from "../domain/ports/outbox-repository.port";
import type { UnitOfWork } from "../domain/ports/unit-of-work.port";
import type { WagerTransactionRepository } from "../domain/ports/wager-transaction-repository.port";
import type { WalletRepository } from "../domain/ports/wallet-repository.port";
import { MoneyProps, Money } from "../domain/value-objects/money";
import { Wallet } from "../domain/wallet";
import { APPLICATION_TOKENS } from "./tokens";

export interface CreateWalletInput {
  id: string;
  playerId: string;
  initialBalance: MoneyProps;
}

@Injectable()
export class CreateWalletUseCase {
  constructor(
    @Inject(APPLICATION_TOKENS.walletRepository) private readonly wallets: WalletRepository,
    @Inject(APPLICATION_TOKENS.transactionRepository)
    private readonly transactions: WagerTransactionRepository,
    @Inject(APPLICATION_TOKENS.ledgerRepository) private readonly ledger: LedgerRepository,
    @Inject(APPLICATION_TOKENS.outboxRepository) private readonly outbox: OutboxRepository,
    @Inject(APPLICATION_TOKENS.unitOfWork) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(input: CreateWalletInput): Promise<Wallet> {
    return this.unitOfWork.execute(async () => {
      const money = Money.from(input.initialBalance);
      if (await this.wallets.findByPlayerAndCurrency(input.playerId, money.currency)) {
        throw new Error("Já existe uma Wallet para o player e moeda informados");
      }

      const wallet = Wallet.open({ ...input, initialBalance: money });
      const transaction = WagerTransaction.create({
        id: randomUUID(), providerId: "internal", externalTransactionId: `opening:${wallet.id}`,
        idempotencyKey: `opening:${wallet.id}`, payloadHash: `opening:${wallet.id}`,
        walletId: wallet.id, playerId: wallet.playerId, roundId: "internal",
        gameId: "internal", kind: WagerTransactionKind.Opening, money, createdAt: wallet.createdAt,
      });
      transaction.markProcessed(undefined, wallet.createdAt);
      await this.wallets.save(wallet);
      await this.transactions.save(transaction);

      if (money.isPositive()) {
        await this.ledger.append(WalletLedgerEntry.create({
          id: randomUUID(), walletId: wallet.id, transactionId: transaction.id,
          direction: LedgerDirection.Credit, money, balanceBefore: Money.zero(money.currency),
          balanceAfter: wallet.balance, createdAt: wallet.createdAt,
        }));
      }

      const event = WagerTransactionProcessed.from(transaction, {
        eventId: randomUUID(), correlationId: transaction.id, occurredAt: wallet.createdAt,
      });
      await this.outbox.enqueue(OutboxMessage.enqueue(event));
      return wallet;
    });
  }
}
