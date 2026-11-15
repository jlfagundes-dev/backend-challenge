import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import mikroOrmConfig from "./database/mikro-orm.config";
import { MikroOrmUnitOfWork } from "./database/mikro-orm-unit-of-work";
import { MikroOrmWalletRepository } from "./database/repositories/mikro-orm-wallet.repository";
import { MikroOrmWagerTransactionRepository } from "./database/repositories/mikro-orm-wager-transaction.repository";
import { MikroOrmLedgerRepository } from "./database/repositories/mikro-orm-ledger.repository";
import { MikroOrmOutboxRepository } from "./database/repositories/mikro-orm-outbox.repository";
import { MikroOrmInboxRepository } from "./database/repositories/mikro-orm-inbox.repository";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [MikroOrmModule.forRoot(mikroOrmConfig)],
  controllers: [AppController],
  providers: [
    AppService,
    MikroOrmUnitOfWork,
    MikroOrmWalletRepository,
    MikroOrmWagerTransactionRepository,
    MikroOrmLedgerRepository,
    MikroOrmOutboxRepository,
    MikroOrmInboxRepository,
  ],
  exports: [
    MikroOrmUnitOfWork,
    MikroOrmWalletRepository,
    MikroOrmWagerTransactionRepository,
    MikroOrmLedgerRepository,
    MikroOrmOutboxRepository,
    MikroOrmInboxRepository,
  ],
})
export class AppModule {}
