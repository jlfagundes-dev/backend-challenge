import { EntityManager } from "@mikro-orm/postgresql";
import { Injectable } from "@nestjs/common";
import { LedgerRepository } from "../../domain/ports/ledger-repository.port";
import { WalletLedgerEntry } from "../../domain/ledger-entry";
import { WalletLedgerEntryEntity } from "../entities/wallet-ledger-entry.entity";
import { WalletLedgerEntryMapper } from "../mappers/wallet-ledger-entry.mapper";

@Injectable()
export class MikroOrmLedgerRepository implements LedgerRepository {
  constructor(private readonly em: EntityManager) {}

  async append(entry: WalletLedgerEntry): Promise<void> {
    this.em.persist(WalletLedgerEntryMapper.toEntity(entry));
    await this.em.flush();
  }

  async findByWalletId(walletId: string): Promise<WalletLedgerEntry[]> {
    const entities = await this.em.find(
      WalletLedgerEntryEntity,
      { walletId },
      { orderBy: { createdAt: "ASC", id: "ASC" } },
    );
    return entities.map((entity) => WalletLedgerEntryMapper.toDomain(entity));
  }
}
