import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import mikroOrmConfig from "./database/mikro-orm.config";
import { MikroOrmUnitOfWork } from "./database/mikro-orm-unit-of-work";
import { MikroOrmWalletRepository } from "./database/repositories/mikro-orm-wallet.repository";
import { MikroOrmWagerTransactionRepository } from "./database/repositories/mikro-orm-wager-transaction.repository";
import { MikroOrmLedgerRepository } from "./database/repositories/mikro-orm-ledger.repository";
import { MikroOrmOutboxRepository } from "./database/repositories/mikro-orm-outbox.repository";
import { MikroOrmInboxRepository } from "./database/repositories/mikro-orm-inbox.repository";
import { CreateWalletUseCase } from "./application/create-wallet.use-case";
import { APPLICATION_TOKENS } from "./application/tokens";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { WalletController } from "./interface/http/controllers/wallet.controller";
import { ProcessWagerTransactionUseCase } from "./application/process-wager-transaction.use-case";
import { WageringController } from "./interface/http/controllers/wagering.controller";
import { SqsWagerConsumer } from "./interface/messaging/sqs-wager.consumer";
import { SqsOutboxPublisher } from "./interface/messaging/sqs-outbox.publisher";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MikroOrmModule.forRoot(mikroOrmConfig)
  ],
  controllers: [AppController, WalletController, WageringController],
  providers: [
    AppService,
    MikroOrmUnitOfWork,
    MikroOrmWalletRepository,
    MikroOrmWagerTransactionRepository,
    MikroOrmLedgerRepository,
    MikroOrmOutboxRepository,
    MikroOrmInboxRepository,
    CreateWalletUseCase,
    ProcessWagerTransactionUseCase,
    SqsWagerConsumer,
    SqsOutboxPublisher,
    { provide: APPLICATION_TOKENS.walletRepository, useExisting: MikroOrmWalletRepository },
    { provide: APPLICATION_TOKENS.transactionRepository, useExisting: MikroOrmWagerTransactionRepository },
    { provide: APPLICATION_TOKENS.ledgerRepository, useExisting: MikroOrmLedgerRepository },
    { provide: APPLICATION_TOKENS.outboxRepository, useExisting: MikroOrmOutboxRepository },
    { provide: APPLICATION_TOKENS.inboxRepository, useExisting: MikroOrmInboxRepository },
    { provide: APPLICATION_TOKENS.unitOfWork, useExisting: MikroOrmUnitOfWork },
  ],
  exports: [
    MikroOrmUnitOfWork,
    MikroOrmWalletRepository,
    MikroOrmWagerTransactionRepository,
    MikroOrmLedgerRepository,
    MikroOrmOutboxRepository,
    MikroOrmInboxRepository,
    CreateWalletUseCase,
    ProcessWagerTransactionUseCase,
  ],
})
export class AppModule {}
