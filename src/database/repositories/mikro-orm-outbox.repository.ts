import { EntityManager, LockMode } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import { OutboxRepository } from "../../domain/ports/outbox-repository.port";
import { OutboxMessage } from "../../domain/outbox-message";
import { OutboxMessageEntity } from "../entities/outbox-message.entity";
import { OutboxMessageMapper } from "../mappers/outbox-message.mapper";

@Injectable()
export class MikroOrmOutboxRepository implements OutboxRepository {
  constructor(private readonly em: EntityManager) {}

  async enqueue(message: OutboxMessage): Promise<void> {
    this.em.persist(OutboxMessageMapper.toEntity(message));
    await this.em.flush();
  }

  async claimDue(now: Date, limit: number): Promise<OutboxMessage[]> {
    const entities = await this.em.find(
      OutboxMessageEntity,
      {
        publishedAt: null,
        $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
      },
      {
        limit,
        lockMode: LockMode.PESSIMISTIC_PARTIAL_WRITE,
        orderBy: { occurredAt: "ASC", id: "ASC" },
      },
    );
    return entities.map((entity) => OutboxMessageMapper.toDomain(entity));
  }

  async save(message: OutboxMessage): Promise<void> {
    const entity = await this.em.findOne(OutboxMessageEntity, { id: message.id });
    if (!entity) {
      this.em.persist(OutboxMessageMapper.toEntity(message));
    } else {
      entity.attempts = message.attempts;
      entity.nextAttemptAt = message.nextAttemptAt;
      entity.publishedAt = message.publishedAt;
    }
    await this.em.flush();
  }
}
