import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import { UnitOfWork } from "../domain/ports/unit-of-work.port";

@Injectable()
export class MikroOrmUnitOfWork implements UnitOfWork {
  constructor(private readonly em: EntityManager) {}

  // Garante sucesso ou rollback de de todo fluxo (Wallet, Wager, Ledger e Outbox da mensagem)
  async execute<T>(work: () => Promise<T>): Promise<T> {
    await this.em.begin(); // inicia a transação
    try {
      const result = await work();
      await this.em.commit(); // confirma a transação
      return result;
    } catch (error) {
      await this.em.rollback(); // desfaz a transação em caso de erro
      throw error;
    }
  }
}
