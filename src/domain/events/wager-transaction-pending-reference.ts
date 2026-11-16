import { IntegrationEvent, IntegrationEventProps } from "./integration-event";
import { WagerTransaction } from "../wager-transaction";

export interface WagerTransactionPendingReferenceData {
  transactionId: string;
  walletId: string;
  referenceExternalTransactionId: string;
}

export class WagerTransactionPendingReference
  extends IntegrationEvent<WagerTransactionPendingReferenceData> {
  readonly eventType = "WagerTransactionPendingReference";
  readonly version = 1;

  private constructor(props: IntegrationEventProps<WagerTransactionPendingReferenceData>) {
    super(props);
  }

  static from(
    transaction: WagerTransaction,
    context: Omit<IntegrationEventProps<WagerTransactionPendingReferenceData>, "data">,
  ): WagerTransactionPendingReference {
    if (!transaction.referenceExternalTransactionId) {
      throw new Error("A transação pendente exige uma referência externa");
    }
    return new WagerTransactionPendingReference({
      ...context,
      data: {
        transactionId: transaction.id,
        walletId: transaction.walletId,
        referenceExternalTransactionId: transaction.referenceExternalTransactionId,
      },
    });
  }
}
