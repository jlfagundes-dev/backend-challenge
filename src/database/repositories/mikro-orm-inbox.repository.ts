import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import { InboxRepository } from "../../domain/ports/inbox-repository.port";
import { InboxMessage } from "../../domain/inbox-message";
import { InboxMessageEntity } from "../entities/inbox-message.entity";
import { InboxMessageMapper } from "../mappers/inbox-message.mapper";

@Injectable()
export class MikroOrmInboxRepository implements InboxRepository {
  constructor(private readonly em: EntityManager) {}

  async findByConsumerAndMessage(
    consumerName: string,
    messageId: string,
  ): Promise<InboxMessage | null> {
    const entity = await this.em.findOne(InboxMessageEntity, {
      consumerName,
      messageId,
    });
    return entity ? InboxMessageMapper.toDomain(entity) : null;
  }

  async save(message: InboxMessage): Promise<void> {
    const entity = await this.em.findOne(InboxMessageEntity, {
      consumerName: message.consumerName,
      messageId: message.messageId,
    });
    const values = InboxMessageMapper.toEntity(message);

    if (entity) {
      entity.processedAt = values.processedAt;
    } else {
      this.em.persist(values);
    }

    await this.em.flush();
  }
}
