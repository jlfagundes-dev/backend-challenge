# Architecture — Distributed Wagering Processor

## Arquitetura Hexagonal e DDD

O projeto segue **Arquitetura Hexagonal (Ports & Adapters)** com **Domain-Driven Design (DDD)** para manter as regras financeiras isoladas de frameworks, banco de dados e mensageria.

### Estrutura de Pastas
```text
src/
├── main.ts
├── app.module.ts
├── domain/                  
│   ├── money.ts             
│   ├── wallet.ts            
│   ├── ledger-entry.ts      
│   ├── wager-transaction.ts 
│   ├── inbox-message.ts     
│   ├── outbox-message.ts    
│   ├── events/              
│   └── ports/              
├── application/             
│   ├── create-wallet.use-case.ts
│   ├── process-wager-transaction.use-case.ts
│   ├── reconcile-wallet.use-case.ts
│   └── reprocess-pending-reference.use-case.ts
├── interface/               
│   ├── http/
│   │   ├── controllers/     
│   │   ├── dtos/
│   │   └── guards/          
│   └── messaging/
│       ├── sqs-consumer.ts  
│       ├── sqs-publisher.ts 
│       └── workers/         
├── database/                
│   ├── entities/            
│   ├── mappers/             
│   ├── migrations/          
│   └── repositories/        
└── observability/           

```

### Papel de cada camada
- domain/: Concentra invariantes, objetos de valor e entidades. Construtores são privados/protegidos com factories (create, from, rehydrate). Não importa NestJS, MikroORM ou AWS SDK.

- application/: Orquestra os casos de uso e depende apenas das interfaces definidas em domain/ports/. HTTP e SQS executam exatamente o mesmo caso de uso (ProcessWagerTransaction).

- interface/: Recebe requisições HTTP e mensagens SQS, valida contratos de entrada e delega para a camada de aplicação.

- database/: Implementa persistência, constraints, migrations e controle transacional/concorrência no PostgreSQL via MikroORM.

## Seção 2 - Autenticação e Controle de Acesso

**Decisão:** Optou-se por não integrar um Identity Provider (IdP) externo nesta entrega para concentrar o timebox nos requisitos centrais de avaliação: correção financeira, controle de concorrência por `walletId`, idempotência persistente, consistência do ledger e confiabilidade via Inbox/Outbox.

**Desenho adotado para produção:**
- **Protocolo e IdP:** Integração via **OAuth 2.0 / OIDC (fluxo *Client Credentials*)** utilizando um IdP externo como **Keycloak** ou **Zitadel**, validando JWTs assinados via JWKS (sem tabela própria de usuários ou armazenamento artesanal de senhas).
- **Autorização por Provedor:** O token emitido pelo IdP carregaria a identidade do provedor (claim `sub` ou `provider_id`), garantindo que um provedor autenticado só possa consultar ou submeter transações vinculadas ao seu próprio `providerId`.
- **Fronteiras de rede e mensageria:**
  - `GET /health/live` e `GET /health/ready` permanecem **públicos** para probes de infraestrutura.
  - Mensagens consumidas via **SQS** são tratadas como canal interno confiável, mantendo as validações de domínio sobre o `providerId` informado no evento.

**Pontos de extensão explícitos no código:**
- `src/interface/http/guards/auth.guard.ts`: `AuthGuard` configurado em modo *no-op* nos controllers de negócio (preservando os endpoints de health abertos), pronto para receber a validação real de Bearer JWT sem alterar os controllers.
- `src/domain/ports/provider-identity.port.ts`: Porta `ProviderIdentityPort` responsável por resolver/validar a identidade do provedor autenticado antes de acionar os casos de uso, permitindo plugar um adaptador OIDC sem impacto em `domain/` ou `application/`.

## Seção 3 — Contexto de Domínio e Invariantes Globais
<!-- Documentar como as invariantes (sem saldo negativo, sem crédito/débito duplicado, sem perda de eventos) são garantidas ponta a ponta. -->

## Seção 4 — ORM, Mapeamento de Money e Estratégia Transacional
<!-- Justificar a escolha do MikroORM, o mapeamento de Money (decimal.js <-> NUMERIC(18, 2) + currency CHAR(3) + rehydrate) e o uso de em.transactional(). -->

## Seção 5 e 6 — Modelo de Domínio, Schema SQL e Transições de Estado
<!-- Documentar constraints/índices no PostgreSQL (UNIQUE, CHECK, imutabilidade do ledger) e a matriz de transições válidas da WagerTransaction. -->

## Seção 7 — Regras de Negócio, PENDING_REFERENCE e Taxonomia de FailureCode
<!-- Documentar interpretações adicionais, política de retry/TTL do worker PENDING_REFERENCE e a tabela completa de failureCode. -->

## Seção 8 — Concorrência e Ordenação por walletId
<!-- Justificar a estratégia de lock por walletId (pessimistic locking / version) e o comportamento com 3+ instâncias simultâneas. -->

## Seção 9 — API HTTP, Idempotência e Reconciliação
<!-- Documentar o algoritmo do payloadHash (JSON canônico), o mapeamento de status HTTP e a estratégia de log/métrica na reconciliação. -->

## Seção 10 e 11 — Mensageria SQS, Inbox e Transactional Outbox
<!-- Documentar fluxo atômico, ack pós-commit, retry/DLQ, graceful shutdown (SIGTERM) e múltiplos publishers concorrentes (SKIP LOCKED). -->

## Seção 12 — Observabilidade
<!-- Documentar formato dos logs JSON estruturados (sem dados sensíveis), métricas expostas e health checks (/health/live e /health/ready). -->

## Seção 14 — Trade-offs e Limitações Conhecidas
<!-- Registrar trade-offs assumidos, limitações atuais e próximos passos (e resultados de teste de carga, se houver). -->