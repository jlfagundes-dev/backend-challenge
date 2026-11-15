import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import mikroOrmConfig from "./database/mikro-orm.config";
import { MikroOrmUnitOfWork } from "./database/mikro-orm-unit-of-work";
import { MikroOrmWalletRepository } from "./database/repositories/mikro-orm-wallet.repository";
import { MikroOrmWagerTransactionRepository } from "./database/repositories/mikro-orm-wager-transaction.repository";
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
  ],
  exports: [
    MikroOrmUnitOfWork,
    MikroOrmWalletRepository,
    MikroOrmWagerTransactionRepository,
  ],
})
export class AppModule {}
