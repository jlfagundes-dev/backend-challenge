import { IntegrationEvent, IntegrationEventProps } from "./integration-event";
import {
  WagerTransaction,
  WagerTransactionStatus,
} from "../wager-transaction";
import { MoneyProps } from "../value-objects/money";

export interface WagerTransactionProcessedData {
  transactionId: string;
  walletId: string;
  kind: string;
  money: MoneyProps;
}
export interface EventContext {
  eventId: string;
  correlationId: string;
  causationId?: string;
  occurredAt: Date;
}
export class WagerTransactionProcessed extends IntegrationEvent<WagerTransactionProcessedData> {
  readonly eventType = "WagerTransactionProcessed";
  readonly version = 1;

  private constructor(
    props: IntegrationEventProps<WagerTransactionProcessedData>,
  ) {
    super(props);
  }

  static from(transaction: WagerTransaction, context: EventContext): WagerTransactionProcessed {
    if (transaction.status !== WagerTransactionStatus.Processed) {
      throw new Error("O evento exige uma transação processada");
    }
    return new WagerTransactionProcessed({
      eventId: context.eventId,
      aggregateId: transaction.walletId,
      correlationId: context.correlationId,
      causationId: context.causationId,
      occurredAt: context.occurredAt,
      data: {
        transactionId: transaction.id,
        walletId: transaction.walletId,
        kind: transaction.kind,
        money: transaction.money.toJSON(),
      },
    });
  }
}
