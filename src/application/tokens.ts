export const APPLICATION_TOKENS = {
  walletRepository: Symbol("WalletRepository"),
  transactionRepository: Symbol("WagerTransactionRepository"),
  ledgerRepository: Symbol("LedgerRepository"),
  outboxRepository: Symbol("OutboxRepository"),
  inboxRepository: Symbol("InboxRepository"),
  unitOfWork: Symbol("UnitOfWork"),
} as const;
