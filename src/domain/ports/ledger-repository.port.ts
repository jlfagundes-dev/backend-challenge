import { WalletLedgerEntry } from "../ledger-entry";

export interface LedgerRepository {
  append(entry: WalletLedgerEntry): Promise<void>;
  findByWalletId(walletId: string): Promise<WalletLedgerEntry[]>;
}
