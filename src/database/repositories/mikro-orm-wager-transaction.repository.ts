import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import { WagerTransactionRepository } from "../../domain/ports/wager-transaction-repository.port";
import { WagerTransaction } from "../../domain/wager-transaction";
import { WagerTransactionEntity } from "../entities/wager-transaction.entity";
import { WagerTransactionMapper } from "../mappers/wager-transaction.mapper";

@Injectable()
export class MikroOrmWagerTransactionRepository implements WagerTransactionRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(WagerTransactionEntity, { id });
    return entity ? WagerTransactionMapper.toDomain(entity) : null;
  }

  async findByIdempotencyKey(key: string): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(WagerTransactionEntity, {
      idempotencyKey: key,
    });
    return entity ? WagerTransactionMapper.toDomain(entity) : null;
  }

  async findByProviderAndExternalId(
    providerId: string,
    externalTransactionId: string,
  ): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(WagerTransactionEntity, {
      providerId,
      externalTransactionId,
    });
    return entity ? WagerTransactionMapper.toDomain(entity) : null;
  }

  async findByReferenceAndKind(
    providerId: string,
    referenceExternalTransactionId: string,
    kind: WagerTransaction["kind"],
  ): Promise<WagerTransaction | null> {
    const entity = await this.em.findOne(WagerTransactionEntity, {
      providerId, referenceExternalTransactionId, kind,
    });
    return entity ? WagerTransactionMapper.toDomain(entity) : null;
  }

  async save(transaction: WagerTransaction): Promise<void> {
    const entity = await this.em.findOne(WagerTransactionEntity, {
      id: transaction.id,
    });
    const values = WagerTransactionMapper.toEntity(transaction);

    if (entity) {
      entity.status = values.status;
      entity.referenceTransactionId = values.referenceTransactionId;
      entity.failureCode = values.failureCode;
      entity.processedAt = values.processedAt;
    } else {
      this.em.persist(values);
    }

    await this.em.flush();
  }
}
