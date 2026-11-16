import { BadRequestException, Body, Controller, Headers, Post } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ProcessWagerTransactionUseCase } from "../../../application/process-wager-transaction.use-case";
import { WagerTransactionDto } from "../dtos/wager-transaction.dto";
import { hashPayload } from "../canonical-payload";

@Controller("wagering/transactions")
export class WageringController {
  constructor(private readonly processTransaction: ProcessWagerTransactionUseCase) {}

  @Post()
  async create(
    @Body() input: WagerTransactionDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    if (!idempotencyKey) throw new BadRequestException("Idempotency-Key é obrigatório");
    const result = await this.processTransaction.execute({
      id: randomUUID(),
      providerId: input.providerId,
      externalTransactionId: input.externalTransactionId,
      playerId: input.playerId,
      walletId: input.walletId,
      roundId: input.roundId,
      gameId: input.gameId,
      kind: input.kind,
      money: input.money,
      referenceExternalTransactionId: input.referenceExternalTransactionId,
      idempotencyKey,
      payloadHash: hashPayload(input),
    });
    return {
      transactionId: result.transaction.id,
      status: result.transaction.status,
      balance: result.balance.toJSON(),
      failureCode: result.transaction.failureCode,
      idempotentReplay: result.idempotentReplay,
    };
  }
}
