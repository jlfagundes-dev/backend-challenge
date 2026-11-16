import { WagerTransaction } from "../wager-transaction";

export interface WagerTransactionRepository {
  findById(id: string): Promise<WagerTransaction | null>;
  findByIdempotencyKey(key: string): Promise<WagerTransaction | null>;
  findByProviderAndExternalId(
    providerId: string,
    externalTransactionId: string,
  ): Promise<WagerTransaction | null>;
  findByReferenceAndKind(
    providerId: string,
    referenceExternalTransactionId: string,
    kind: WagerTransaction["kind"],
  ): Promise<WagerTransaction | null>;
  save(transaction: WagerTransaction): Promise<void>;
}
