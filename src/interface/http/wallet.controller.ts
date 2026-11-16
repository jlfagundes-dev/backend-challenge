import { Body, Controller, Post } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { CreateWalletUseCase } from "../../application/create-wallet.use-case";
import { CreateWalletDto } from "./dtos/create-wallet.dto";

@Controller("wallets")
export class WalletController {
  constructor(private readonly createWallet: CreateWalletUseCase) {}

  @Post()
  async create(@Body() input: CreateWalletDto) {
    const wallet = await this.createWallet.execute({
      id: randomUUID(),
      playerId: input.playerId,
      initialBalance: input.initialBalance,
    });
    return {
      id: wallet.id,
      playerId: wallet.playerId,
      balance: wallet.balance.toJSON(),
      version: wallet.version,
    };
  }
}
