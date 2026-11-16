import { IntegrationEvent, IntegrationEventProps } from "./integration-event";
import { WagerTransaction } from "../wager-transaction";
import { MoneyProps } from "../value-objects/money";

export interface WagerTransactionRejectedData {
  transactionId: string;
  walletId: string;
  kind: string;
  money: MoneyProps;
  failureCode: string;
}

// Garante que o evento siga o padrao de montagem
export class WagerTransactionRejected
  extends IntegrationEvent<WagerTransactionRejectedData> {
  readonly eventType = "WagerTransactionRejected";
  readonly version = 1;

  private constructor(props: IntegrationEventProps<WagerTransactionRejectedData>) {
    super(props);
  }

  static from(
    transaction: WagerTransaction,
    context: Omit<IntegrationEventProps<WagerTransactionRejectedData>, "data">,
  ): WagerTransactionRejected {
    if (!transaction.failureCode) {
      throw new Error("O evento exige uma transação rejeitada");
    }
    return new WagerTransactionRejected({
      ...context,
      data: {
        transactionId: transaction.id,
        walletId: transaction.walletId,
        kind: transaction.kind,
        money: transaction.money.toJSON(),
        failureCode: transaction.failureCode,
      },
    });
  }
}
