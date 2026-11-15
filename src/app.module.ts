import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Module } from "@nestjs/common";
import mikroOrmConfig from "./database/mikro-orm.config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [MikroOrmModule.forRoot(mikroOrmConfig)],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
