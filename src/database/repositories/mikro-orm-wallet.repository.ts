import { EntityManager, LockMode } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import { Wallet } from "../../domain/wallet";
import { WalletRepository } from "../../domain/ports/wallet-repository.port";
import { WalletEntity } from "../entities/wallet.entity";
import { WalletMapper } from "../mappers/wallet.mapper";

@Injectable()
export class MikroOrmWalletRepository implements WalletRepository {
  constructor(private readonly em: EntityManager) {}

  async findById(id: string): Promise<Wallet | null> {
    const entity = await this.em.findOne(WalletEntity, { id });
    return entity ? WalletMapper.toDomain(entity) : null;
  }

  async findByIdForUpdate(id: string): Promise<Wallet | null> {
    const entity = await this.em.findOne(
      WalletEntity,
      { id },
      { lockMode: LockMode.PESSIMISTIC_WRITE }, // Bloqueia na LEITURA a linha da carteira (Wallet)
    );
    return entity ? WalletMapper.toDomain(entity) : null;
  }

  async findByPlayerAndCurrency(
    playerId: string,
    currency: string,
  ): Promise<Wallet | null> {
    const entity = await this.em.findOne(WalletEntity, { playerId, currency });
    return entity ? WalletMapper.toDomain(entity) : null;
  }

  async save(wallet: Wallet): Promise<void> {
    const entity = await this.em.findOne(WalletEntity, { id: wallet.id });
    const values = WalletMapper.toEntity(wallet);

    if (entity) {
      entity.playerId = values.playerId;
      entity.currency = values.currency;
      entity.balance = values.balance;
      entity.version = values.version;
      entity.updatedAt = values.updatedAt;
    } else {
      this.em.persist(values); // marca pra salvar
    }

    await this.em.flush(); // salva no banco de dados
  }
}
