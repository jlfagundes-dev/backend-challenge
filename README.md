# Distributed Wagering Processor

Serviço financeiro distribuído para processamento de transações de apostas (`BET`, `WIN`, `LOSS`, `REFUND`, `ROLLBACK`) com foco em correção financeira, concorrência entre múltiplas instâncias, idempotência persistente e consistência via Transactional Outbox.

## Stack

- **Runtime / Test Runner:** Bun 1.x
- **Linguagem:** TypeScript (`strict`)
- **Framework:** NestJS
- **Banco de Dados & ORM:** PostgreSQL + MikroORM (migrations versionadas e reversíveis)
- **Mensageria:** AWS SQS FIFO via LocalStack
- **Orquestração:** Docker Compose

## Arquitetura

A solução utiliza Arquitetura Hexagonal + DDD com separação entre `domain/`, `application/`, `interface/` e `database/`. Detalhes completos e decisões técnicas estão em [`./docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Como executar

> Seção em construção — os comandos de Docker Compose, migrations e testes serão adicionados após a configuração do ambiente base.
