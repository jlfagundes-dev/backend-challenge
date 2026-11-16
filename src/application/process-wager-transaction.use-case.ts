import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { WalletLedgerEntry, LedgerDirection } from "../domain/ledger-entry";
import { OutboxMessage } from "../domain/outbox-message";
import { WagerTransactionProcessed } from "../domain/events/wager-transaction-processed";
import { WagerTransactionRejected } from "../domain/events/wager-transaction-rejected";
import {
  WagerTransaction,
  WagerTransactionKind,
} from "../domain/wager-transaction";
import type { LedgerRepository } from "../domain/ports/ledger-repository.port";
import type { OutboxRepository } from "../domain/ports/outbox-repository.port";
import type { UnitOfWork } from "../domain/ports/unit-of-work.port";
import type { WagerTransactionRepository } from "../domain/ports/wager-transaction-repository.port";
import type { WalletRepository } from "../domain/ports/wallet-repository.port";
import { MoneyProps, Money } from "../domain/value-objects/money";
import { APPLICATION_TOKENS } from "./tokens";

export interface ProcessWagerTransactionInput {
  id: string;
  providerId: string;
  externalTransactionId: string;
  idempotencyKey: string;
  payloadHash: string;
  walletId: string;
  playerId: string;
  roundId: string;
  gameId: string;
  kind: WagerTransactionKind;
  money: MoneyProps;
}

export interface ProcessWagerTransactionResult {
  transaction: WagerTransaction;
  balance: Money;
  idempotentReplay: boolean;
}

@Injectable()
export class ProcessWagerTransactionUseCase {
  constructor(
    @Inject(APPLICATION_TOKENS.walletRepository) private readonly wallets: WalletRepository,
    @Inject(APPLICATION_TOKENS.transactionRepository)
    private readonly transactions: WagerTransactionRepository,
    @Inject(APPLICATION_TOKENS.ledgerRepository) private readonly ledger: LedgerRepository,
    @Inject(APPLICATION_TOKENS.outboxRepository) private readonly outbox: OutboxRepository,
    @Inject(APPLICATION_TOKENS.unitOfWork) private readonly unitOfWork: UnitOfWork,
  ) {}

  execute(input: ProcessWagerTransactionInput): Promise<ProcessWagerTransactionResult> {
    return this.unitOfWork.execute(async () => {
      // Ajuste para comportamento certo em apostas simultaneas, ja bloqueia a carteira wallet
      if (input.kind !== WagerTransactionKind.Bet) {
        throw new Error("Esta etapa suporta somente transações BET");
      }
      const money = Money.from(input.money);
      const wallet = await this.wallets.findByIdForUpdate(input.walletId);
      if (!wallet) throw new Error("Wallet não encontrada");
      if (wallet.playerId !== input.playerId) throw new Error("A Wallet não pertence ao player");

      // Procura uma transação já processada
      const existing = await this.transactions.findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        // Valida suspeitas de fraude por exemplo mesmo idempotencyKey, um é de 100 e outra de 200, ou seja, payload divergente
        if (!existing.matchesPayload(input.payloadHash)) {
          throw new Error("Conflito de idempotência: payload divergente");
        }
        return { transaction: existing, balance: wallet.balance, idempotentReplay: true };
      }

      const transaction = WagerTransaction.create({
        ...input, money, createdAt: new Date(),
      });
      try {
        const change = wallet.debit(money);
        // Atualiza estado de pending para processed
        transaction.markProcessed(undefined, new Date());
        await this.wallets.save(wallet);
        await this.transactions.save(transaction);
        await this.ledger.append(WalletLedgerEntry.create({
          id: randomUUID(), walletId: wallet.id, transactionId: transaction.id,
          direction: LedgerDirection.Debit, money,
          balanceBefore: change.before, balanceAfter: change.after, createdAt: new Date(),
        }));
        await this.outbox.enqueue(OutboxMessage.enqueue(WagerTransactionProcessed.from(
          transaction, { eventId: randomUUID(), correlationId: transaction.id, occurredAt: new Date() },
        )));
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("Saldo insuficiente")) throw error;
        transaction.reject("INSUFFICIENT_FUNDS");
        // Salva a transação rejeitada para auditoria
        await this.transactions.save(transaction);
        await this.outbox.enqueue(OutboxMessage.enqueue(WagerTransactionRejected.from(
          transaction, { eventId: randomUUID(), aggregateId: wallet.id,
            correlationId: transaction.id, occurredAt: new Date() },
        )));
      }
      return { transaction, balance: wallet.balance, idempotentReplay: false };
    });
  }
}
