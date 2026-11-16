import { Type } from "class-transformer";
import { IsEnum, IsString, IsUUID, ValidateNested } from "class-validator";
import { WagerTransactionKind } from "../../../domain/wager-transaction";
import { MoneyDto } from "./money.dto";

export class WagerTransactionDto {
  @IsString() providerId!: string;
  @IsString() externalTransactionId!: string;
  @IsUUID() playerId!: string;
  @IsUUID() walletId!: string;
  @IsString() roundId!: string;
  @IsString() gameId!: string;
  @IsEnum(WagerTransactionKind) kind!: WagerTransactionKind;

  @ValidateNested()
  @Type(() => MoneyDto)
  money!: MoneyDto;
}
