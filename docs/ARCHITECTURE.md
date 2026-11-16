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

As invariantes globais representam as regras de negócio invioláveis do processador de apostas. Elas são garantidas diretamente no núcleo do domínio (`domain/`) e reforçadas por restrições estruturais no banco de dados.

### 1. Impossibilidade de Saldo Negativo (Zero Overdraft)
- **Regra:** Nenhuma carteira (`Wallet`) pode ficar com saldo líquido menor que zero após a efetivação de um débito ou aposta (`BET`).
- **Garantia:** A validação é aplicada na entidade de domínio e protegida ativamente em nível de banco de dados por meio de bloqueio pessimista (`PESSIMISTIC_WRITE`) e restrições de verificação (`CHECK constraints`), impedindo condições de corrida (*race conditions*) em requisições simultâneas.

### 2. Prevenção estrita contra Duplicidade (Idempotência Persistente)
- **Regra:** A mesma transação externa ou requisição de aposta nunca pode ser processada mais de uma vez, mesmo que seja enviada repetidas vezes por falhas de rede.
- **Garantia:** O sistema valida a unicidade através da `idempotencyKey` e de chaves compostas restritas no banco de dados (`provider_id + external_transaction_id`), além de registrar o fluxo de entrada no padrão **Inbox Message**.

### 3. Garantia de Entrega de Eventos (Zero Message Loss)
- **Regra:** Nenhum evento de integração gerado por uma transação financeira bem-sucedida pode ser perdido, mesmo se o serviço de mensageria (SQS) estiver temporariamente indisponível.
- **Garantia:** Utilização do padrão **Transactional Outbox Message**, onde a transação de negócio e a intenção de envio do evento são gravadas na mesma transação atômica do banco de dados (`UnitOfWork`).

### 4. Imutabilidade do Ledger (Trilha de Auditoria Financeira)
- **Regra:** Os registros de movimentação financeira no livro-razão (`LedgerEntry`) são estritamente append-only (somente inserção). Nenhuma entrada de débito ou crédito pode ser alterada ou apagada após ser persistida.
- **Garantia:** O mapeamento do ORM e as regras de domínio não expõem métodos de atualização ou remoção para os registros de ledger, preservando a auditoria completa.

## Seção 4 — ORM, Mapeamento de Money e Estratégia Transacional

### 1. Por que MikroORM?
- **Escolha técnica:** O MikroORM foi escolhido por oferecer uma API rica baseada no padrão *Unit of Work* e *Identity Map*, garantindo controle transacional refinado e alta performance no TypeScript, sem a verbosidade ou rigidez de ORMs legados.
- **Vantagem prática:** Facilita a gestão de bloqueios pessimistas e transações atômicas de forma limpa e integrada ao ecossistema NestJS.

### 2. Mapeamento Seguro de Dinheiro (`Money` & `decimal.js`)
- **O Problema:** Tipos nativos do JavaScript/TypeScript (`number` / float) causam erros críticos de arredondamento em cálculos financeiros (ex: `0.1 + 0.2 !== 0.3`).
- **A Solução:** Encapsulamento da biblioteca **`decimal.js`** dentro do Value Object `Money`.
- **No Banco de Dados:** Mapeado para o tipo nativo **`NUMERIC(18, 2)`** combinado com o código da moeda (`CHAR(3)`), garantindo precisão matemática absoluta e sem perda de centavos nas conversões de persistência.

### 3. Estratégia Transacional (`Unit of Work`)
- **Garantia de Atomicidade:** Todas as operações críticas de escrita (alteração de saldo + criação de ledger + enfileiramento na outbox) são executadas dentro de uma única transação de banco de dados (`em.transactional()`).
- **Fail-Fast:** Se qualquer etapa falhar (seja no domínio ou na mensageria), o banco faz o *rollback* completo, evitando dados corrompidos ou estados inconsistentes na carteira.

## Seção 5 e 6 — Modelo de Domínio, Schema SQL e Transições de Estado

### 1. Modelo de Domínio e Schema SQL
O banco de dados foi projetado com restrições rígidas para proteger a integridade do domínio a nível de infraestrutura:
- **Tabela `wallets`:** Armazena o saldo atual utilizando `NUMERIC(18, 2)` para evitar erros de ponto flutuante, protegido por uma constraint `CHECK (balance >= 0)` que impede saldo negativo no nível físico.
- **Tabela `ledger_entries`:** Livro-razão financeiro modelado como estritamente *append-only*. Nenhuma linha pode ser atualizada ou deletada, garantindo uma trilha de auditoria imutável.
- **Tabela `wager_transactions`:** Possui chaves compostas e restrições de unicidade (`UNIQUE`) em cima de `provider_id + external_transaction_id` e da `idempotency_key`, blindando o sistema contra requisições duplicadas.

### 2. Matriz de Transições de Estado (`WagerTransaction`)
A transição de estados da aposta é controlada por regras estritas no domínio para evitar saltos inválidos ou fraudes de ciclo de vida:
- **`PENDING` (Pendente):** Estado inicial quando a requisição de aposta/transação é recebida e registrada.
- **`COMPLETED` (Concluída):** Transição válida a partir de `PENDING` quando o débito/crédito na carteira é efetivado com sucesso.
- **`FAILED` (Falhada):** Atingido quando a operação é rejeitada por saldo insuficiente, erro de validação ou falha sistêmica.
- **`REFUNDED` / `ROLLED_BACK` (Estornada / Revertida):** Estados de compensação possíveis apenas para transações previamente `COMPLETED`, garantindo que o dinheiro retorne de forma correta para a carteira do jogador.

## Seção 7 — Regras de Negócio, PENDING_REFERENCE e Taxonomia de FailureCode

### 1. Regras de Negócio e Interpretações
- **Consistência e Validação Prévia:** Antes de movimentar a carteira, o sistema valida a existência do jogador, se a carteira está ativa e se há saldo suficiente (para operações de débito/aposta), evitando escrituras inválidas no banco de dados.
- **Tratamento de Referências Pendentes (`PENDING_REFERENCE`):** Utilizado para cenários onde uma transação depende de uma confirmação externa ou assíncrona que ainda não retornou, mantendo o estado sob controle até a resolução.

### 2. Política de Retry e TTL para `PENDING_REFERENCE`
- **Estratégia de Retentativa:** Processos em segundo plano reavaliam periodicamente os registros pendentes aplicando backoff exponencial para evitar sobrecarga no banco de dados ou em serviços externos dependentes.
- **Time-To-Live (TTL):** Transações que permaneçam no estado pendente além do limite estipulado (ex: timeout de 24 horas) sofrem transição automática para um estado final de falha ou estorno preventivo, liberando recursos bloqueados.

### 3. Taxonomia de FailureCode
Para padronizar os erros e facilitar o monitoramento e o suporte, os códigos de falha foram catalogados da seguinte forma:
- `INSUFFICIENT_FUNDS`: A carteira não possui saldo líquido suficiente para cobrir o valor da aposta/débito.
- `WALLET_NOT_FOUND` / `WALLET_INACTIVE`: O identificador da carteira informado não existe ou encontra-se bloqueado/inativo.
- `DUPLICATE_TRANSACTION`: Tentativa de processar uma transação com chave de idempotência ou ID externo já existente.
- `INVALID_TRANSITION`: Tentativa de alterar o estado de uma aposta para um estágio não permitido pela matriz de domínio.
- `SYSTEM_ERROR`: Erros inesperados de infraestrutura ou falhas genéricas de banco de dados/mensageria que exigem nova tentativa.

## Seção 8 — Concorrência e Ordenação por walletId

### 1. Estratégia de Concorrência (Lock Pessimista)
- **Prevenção de Race Conditions:** Para eliminar o risco de *lost updates* e garantir a integridade matemática do saldo em cenários de alta concorrência, o sistema utiliza bloqueio pessimista (`LockMode.PESSIMISTIC_WRITE`) diretamente no banco de dados ao carregar a entidade `Wallet` para processamento.
- **Isolamento por Carteira:** O mecanismo de lock garante que transações simultâneas direcionadas à **mesma** carteira (`walletId`) sejam serializadas pelo banco de dados, enquanto carteiras **diferentes** continuam processando de forma totalmente paralela e independente.

### 2. Ordenação de Mensagens no SQS FIFO
- **Message Group ID:** No fluxo de mensageria assíncrona, as mensagens enviadas para as filas SQS FIFO utilizam o `walletId` como `MessageGroupId`.
- **Garantia de Sequenciamento:** Isso assegura que todos os eventos e requisições vinculados a uma mesma carteira sejam entregues e consumidos estritamente na ordem cronológica em que foram gerados, evitando inversões de estado (como um estorno sendo processado antes da aposta original).

### 3. Comportamento com Múltiplas Instâncias Simultâneas
- **Escalabilidade com Segurança:** Com 3 ou mais instâncias da aplicação rodando em paralelo, o SQS FIFO distribui as mensagens de carteiras distintas entre os diferentes *workers*, maximizando a vazão. 
- **Arbitragem de Conflitos:** Caso duas instâncias tentem processar operações para o *mesmo* `walletId` no mesmo microssegundo, o SQS garante a ordem de entrega e o banco de dados atua como a última linha de defesa através do lock pessimista, enfileirando a execução de forma segura sem corromper dados.

## Seção 9 — API HTTP, Idempotência e Reconciliação

### 1. API HTTP e Mapeamento de Status
- **Padronização de Contratos:** Os endpoints REST expõem as operações de wager e consulta de carteira utilizando DTOs validados via `class-validator` e `class-transformer` no NestJS.
- **Mapeamento Semântico de Resposta:** Os resultados do domínio e da aplicação são traduzidos para códigos de status HTTP adequados (ex: `201 Created` para operações bem-sucedidas, `400 Bad Request` para falhas de validação, `404 Not Found` para carteiras inexistentes e `422 Unprocessable Entity` para regras de negócio violadas como saldo insuficiente).

### 2. Idempotência por `payloadHash`
- **Garantia de Segurança em Requisições HTTP:** Para evitar processamentos duplicados originados por retentativas de rede de clientes, o sistema calcula um hash canônico do payload (`payloadHash`) aliado à chave de idempotência.
- **Prevenção de Efeitos Colaterais:** Caso uma requisição idêntica seja enviada múltiplas vezes dentro da janela de retenção, a aplicação identifica o registro existente e retorna o resultado armazenado anteriormente sem reexecutar a movimentação financeira.

### 3. Estratégia de Reconciliação
- **Verificação de Consistência:** Mecanismos dedicados (como o caso de uso de reconciliação) auditam periodicamente o estado das transações e o saldo agregado das carteiras em relação ao ledger.
- **Log e Alerta:** Divergências entre o saldo atual da carteira e a soma matemática das entradas do livro-razão disparam logs estruturados de auditoria e métricas para investigação imediata, garantindo a rastreabilidade financeira ponta a ponta.

## Seção 10 e 11 — Mensageria SQS, Inbox e Transactional Outbox

### 1. Fluxo Atômico e Transactional Outbox / Inbox
- **Garantia de Consistência Dual:** O sistema utiliza o padrão **Transactional Outbox** para gravar o evento de integração na mesma transação de banco de dados (`UnitOfWork`) que persiste a alteração de saldo e o ledger. Isso elimina o problema de *dual-write* (falhar ao publicar o evento após salvar no banco).
- **Padrão Inbox (Consumo Idempotente):** No consumidor (`sqs-wager.consumer.ts`), as mensagens recebidas são registradas e validadas na tabela de Inbox antes do processamento, garantindo que mensagens duplicadas entregues pelo SQS não executem operações financeiras em duplicidade.

### 2. Confirmação de Entrega (Ack Pós-Commit) e Resiliência
- **Zero Perda de Mensagens:** A exclusão (`DeleteMessage`) da mensagem na fila do SQS só ocorre após o sucesso absoluto do commit no banco de dados e o despacho efetivo pelo publisher.
- **Retry e Dead Letter Queue (DLQ):** Mensagens que falham no processamento por erros transitórios retornam para a fila SQS para novas tentativas conforme a política de visibilidade. Após o esgotamento dos limites, são direcionadas automaticamente para a Dead Letter Queue (`wager-transactions-dlq.fifo`) para análise e auditoria.

### 3. Múltiplos Publishers Concorrentes (`SKIP LOCKED`)
- **Processamento Escalável de Outbox:** Para evitar que múltiplas instâncias da aplicação processem os mesmos eventos de outbox simultaneamente, o publicador (`sqs-outbox.publisher.ts`) utiliza o comando `FOR UPDATE SKIP LOCKED` do PostgreSQL.
- **Distribuição de Carga sem Conflito:** Cada instância captura um lote exclusivo de mensagens pendentes, ignorando as linhas que já estão sendo tratadas por outras instâncias, garantindo alta vazão e concorrência segura.

### 4. Encerramento Gracioso (Graceful Shutdown - SIGTERM)
- **Proteção contra Interrupção Abrupta:** Os consumidores e workers escutam eventos de encerramento do sistema (`SIGTERM`). 
- **Conclusão Segura:** Ao receber o sinal de parada, a aplicação interrompe a leitura de novas mensagens da fila SQS, permitindo que os lotes em processamento ativo terminem com segurança antes de desligar o contêiner, evitando perda de dados ou mensagens corrompidas em trânsito.

## Seção 12 — Observabilidade
<!-- Documentar formato dos logs JSON estruturados (sem dados sensíveis), métricas expostas e health checks (/health/live e /health/ready). -->

## Seção 14 — Trade-offs e Limitações Conhecidas
<!-- Registrar trade-offs assumidos, limitações atuais e próximos passos (e resultados de teste de carga, se houver). -->