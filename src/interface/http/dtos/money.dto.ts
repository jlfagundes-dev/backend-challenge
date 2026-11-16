import { IsString, Matches } from "class-validator";

export class MoneyDto {
  @IsString()
  @Matches(/^\d+(?:\.\d{1,2})?$/, {
    message: "amount deve ser um decimal não negativo com até 2 casas",
  })
  amount!: string;

  @IsString()
  @Matches(/^[A-Z]{3}$/, {
    message: "currency deve ser um código ISO-4217 com 3 letras",
  })
  currency!: string;
}
