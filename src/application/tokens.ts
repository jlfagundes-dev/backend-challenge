export const APPLICATION_TOKENS = {
  walletRepository: Symbol("WalletRepository"),
  transactionRepository: Symbol("WagerTransactionRepository"),
  ledgerRepository: Symbol("LedgerRepository"),
  outboxRepository: Symbol("OutboxRepository"),
  unitOfWork: Symbol("UnitOfWork"),
} as const;
