import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import { UnitOfWork } from "../domain/ports/unit-of-work.port";

@Injectable()
export class MikroOrmUnitOfWork implements UnitOfWork {
  constructor(private readonly em: EntityManager) {}

  execute<T>(work: () => Promise<T>): Promise<T> {
    return this.em.transactional(() => work()); // garante sucesso ou rollback de todo fluxo (Wallet, Wager, Ledger e Outbox da mensagem).
  }
}
