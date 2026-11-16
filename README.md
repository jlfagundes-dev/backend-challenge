# Distributed Wagering Processor

Serviço financeiro distribuído para processamento de transações de apostas (`BET`, `WIN`, `LOSS`, `REFUND`, `ROLLBACK`) com foco em correção financeira, concorrência entre múltiplas instâncias, idempotência persistente e consistência via Transactional Outbox.

## Stack

- **Runtime / Test Runner:** Bun 1.x
- **Linguagem:** TypeScript (`strict`)
- **Framework:** NestJS
- **Banco de Dados & ORM:** PostgreSQL + MikroORM
- **Mensageria:** AWS SQS FIFO via LocalStack
- **Orquestração:** Docker Compose

## Arquitetura

A solução utiliza Arquitetura Hexagonal + DDD com separação entre `domain/`, `application/`, `interface/` e `database/`. Detalhes completos e decisões técnicas estão em [`./docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Como executar

1. **Clone o repositório e acesse a pasta do projeto:**
   ```bash
   git clone https://github.com/jlfagundes-dev/backend-challenge
   cd backend-challenge
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```

3. **Instale as dependências:**
   ```bash
   bun install
   ```

4. **Suba a infraestrutura (PostgreSQL e LocalStack/SQS):**
   ```bash
   docker compose up -d
   ```

5. **Execute as migrações do banco de dados:**
   ```bash
   bun run migration:up
   ```

6. **Inicie a aplicação:**
   * Modo de desenvolvimento (com *watch*):
     ```bash
     bun run start:dev
     ```
   * Modo de depuração (*debug*):
     ```bash
     bun run start:debug
     ```

---

## Executando os Testes

* **Todos os testes:**
  ```bash
  bun run test
  ```

* **Somente testes unitários:**
  ```bash
  bun test test/unit
  ```

* **Somente testes de integração:**
  ```bash
  bun test test/integration
  ```

* **Testes com relatório de cobertura (*coverage*):**
  ```bash
  bun test --coverage
  ```