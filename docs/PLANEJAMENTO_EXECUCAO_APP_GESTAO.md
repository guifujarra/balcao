# Plano Mestre de Execução — App de Gestão de Estoque e Vendas

> Especificação operacional para o Codex construir o app em sequência, com qualidade visual e gates obrigatórios.

## 0. Instrução de uso

Leia este documento inteiro antes de alterar o projeto. Execute os milestones na ordem. Em cada milestone:

1. inspecione o estado atual;
2. implemente somente o escopo definido;
3. execute lint, typecheck, testes e build;
4. corrija todos os erros e warnings relevantes;
5. faça revisão visual quando houver UI;
6. avance somente com todos os gates verdes.

Não deixar erro conhecido para o próximo milestone. Preservar alterações existentes do usuário.

---

## 1. Visão do produto

Construir um sistema completo de gestão de loja que pareça simples. O usuário deve sentir que pode:

```text
Abriu → Escaneou → Fez a operação → Acabou
```

O público inicial inclui mercados, mercearias, conveniências e pequenas lojas, mas o domínio deve permanecer genérico.

### Primeiro release

O usuário deve conseguir, offline:

- cadastrar e editar produtos;
- pesquisar por nome, SKU e código de barras;
- registrar entrada, saída, ajuste e devolução;
- visualizar histórico de estoque;
- ler barcode e QR Code;
- criar combos e gerar QR próprio;
- movimentar combos atomicamente;
- realizar vendas no PDV;
- escolher pagamento local;
- ver indicadores e alertas;
- fechar e reabrir o app sem perder dados.

### Preparar, mas não implementar agora

Preparar arquitetura para Spring Boot, PostgreSQL, autenticação, múltiplos usuários, múltiplas lojas, backup, múltiplos dispositivos, sync, dashboard web e permissões.

Não implementar agora: cloud, AWS, Kafka, Redis, Kubernetes, Pix real, adquirência, integração bancária, NF-e/NFC-e, assinatura ou multi-tenant completo.

---

## 2. Princípios inegociáveis

### Produto

- Simplicidade na superfície, robustez por baixo.
- Scanner é ação central.
- Offline é o modo operacional principal, não um modo degradado.
- Toda ação importante tem feedback visual claro.
- Nenhuma alteração de estoque é silenciosa.

### Arquitetura

- React não executa SQL.
- React não chama endpoint diretamente.
- React não importa mock diretamente.
- Regra de negócio não vive em componentes.
- Repositories e services são portas de dados e casos de uso.
- SQLite é o banco operacional local permanente, inclusive com backend futuro.
- IDs são UUID geráveis offline.
- Operações compostas são transacionais.
- Toda integração nativa tem abstração de plataforma compatível com Android e iOS.

### Qualidade

- TypeScript strict.
- Não usar any para silenciar erros.
- Não trocar funcionalidade por TODO quando ela puder ser implementada localmente.
- Não avançar com lint, typecheck, teste ou build falhando.
- Toda alteração visual passa por revisão em vários tamanhos de tela.

---

## 3. Stack

```text
React
TypeScript strict
Vite
Capacitor
Android
iOS
SQLite
Migrations versionadas
Repositories
Use cases
Spring Boot/PostgreSQL preparados para fase futura
```

Escolher dependências mantidas e compatíveis com a versão do Capacitor. Antes de adicionar uma biblioteca relevante, verificar necessidade real e suporte equivalente nos dois sistemas.

---

## 4. Design system e interface

### Direção visual

Clean, moderna, acolhedora, mobile-first, com bastante espaço visual e hierarquia clara. A interface deve parecer um produto profissional, não template SaaS, ERP antigo ou coleção de telas geradas por vibe coding.

### Tokens obrigatórios

Centralizar tokens para:

```text
cores
tipografia
espaçamento
radius
bordas
elevação
motion
foco
success / warning / danger / info
```

Escala inicial de espaçamento:

```text
4 · 8 · 12 · 16 · 24 · 32 · 48
```

Raios predominantes:

```text
8px · 10px · 12px
```

Usar uma única família de ícones, preferencialmente Lucide ou equivalente. A cor primária da marca serve para ações, seleção e destaque.

### Proibições

Não criar, sem justificativa:

- gradientes decorativos aleatórios;
- glassmorphism ou glow;
- card dentro de card;
- sombra forte em tudo;
- radius gigante em todos os componentes;
- emoji como ícone;
- cinco estilos de botão;
- novos padrões visuais isolados;
- cores hardcoded fora dos tokens.

### UI Kit

Criar a rota /dev/ui-kit com exemplos e estados de:

```text
Button, IconButton, Input, SearchField, Select, NumberField,
ProductRow, ProductCard, Badge, StatCard, Alert, Modal,
BottomSheet, Toast, Tabs, EmptyState, LoadingState,
ErrorState, ConfirmDialog, ScannerOverlay
```

Toda feature nova deve reutilizar o UI Kit. Um novo padrão visual deve entrar primeiro no sistema.

### Navegação

```text
Início · Estoque · Escanear · Vendas · Mais
```

Escanear tem destaque visual. Em Mais ficam Compras, Combos, Clientes, Fornecedores, Financeiro, Relatórios e Configurações.

### Home

Construir primeiro com dados mockados, usando contratos que depois receberão dados reais. Não redesenhar quando SQLite entrar.

```text
Loja atual
Saudação
Vender · Escanear · Produto · Combo
Vendas de hoje
Quantidade de produtos
Estoque baixo · Sem estoque · Vencendo
Mais vendidos ou recentes
```

---

## 5. UX

- A ação primária de cada tela é única e clara.
- Operações frequentes exigem poucos toques.
- Mostrar contexto atual e resultado da ação.
- Confirmar ações destrutivas.
- Usar bottom sheets para ações rápidas no celular.
- Manter dados digitados quando validação falhar.
- Desenhar loading, vazio, erro e sucesso.
- Preservar o carrinho ao abrir o scanner.
- Oferecer fallback manual quando câmera não estiver disponível.

---

## 6. Arquitetura

```text
React/UI
  ↓
Hooks e controllers de feature
  ↓
Use cases / application services
  ↓
Repository ports e platform ports
  ↓
SQLite adapter · scanner adapter · storage adapter
  ↓
Outbox e sync engine futuro
  ↓
Spring Boot / PostgreSQL futuro
```

O domínio não importa React, Capacitor, SQLite ou HTTP.

### Estrutura sugerida

```text
src/
  app/{bootstrap,navigation,providers,routes}
  design-system/{tokens,components,icons,typography}
  features/{home,products,inventory,scanner,combos,sales}
           {purchases,customers,suppliers,finance,reports,settings,dev-ui-kit}
  domain/{product,inventory,combo,sale,purchase,customer,supplier,finance,store,shared}
  application/{use-cases,services,repositories,ports}
  infrastructure/{database,migrations,repositories,sync}
  platform/{barcode,qr,haptics,files,permissions,storage}
  shared/{types,utils,validation,formatting}
```

Não criar camadas vazias ou arquitetura enterprise sem necessidade.

---

## 7. Domínio

Entidades relevantes mantêm id, createdAt, updatedAt, deletedAt opcional, version e syncStatus.

### Store

id, name, currency, timezone.

### Category

id, storeId, name, color opcional.

### Product

```text
id, storeId, name, barcode?, sku?, categoryId?,
salePrice, costPrice?, quantity, minimumStock?, unit,
expirationDate?, createdAt, updatedAt, deletedAt?, version, syncStatus
```

### InventoryMovement

```text
id, storeId, productId, type, quantityDelta,
previousQuantity, currentQuantity, reason?,
referenceType?, referenceId?, createdAt, createdBy?
```

Tipos: PURCHASE, SALE, IN, OUT, ADJUSTMENT, COMBO, RETURN.

Toda alteração de quantidade cria uma movimentação.

### Combo

```text
Combo: id, storeId, name, description?, qrPayload, salePrice?, active
ComboItem: id, comboId, productId, quantity
```

### Sale

```text
Sale: id, storeId, subtotal, discount, total, paymentMethod, status,
      createdAt, completedAt?
SaleItem: id, saleId, productId, productNameSnapshot, unitPrice,
          quantity, subtotal
```

Pagamentos: PIX, CASH, CARD, OTHER. Status: DRAFT, COMPLETED, CANCELLED.

Guardar snapshot de nome e preço no item da venda.

### Compras, clientes, fornecedores e financeiro

Preparar:

```text
Supplier: id, storeId, name, document?, phone?, email?, notes?
Customer: id, storeId, name, phone?, email?, notes?
Purchase: id, supplierId, total, status, createdAt, completedAt?
PurchaseItem: purchaseId, productId, quantity, unitCost, subtotal
CashSession, CashEntry, Expense, Receivable, Payable
```

---

## 8. Repositories, services e transações

Exemplo de porta:

```ts
interface ProductRepository {
  findAll(filters?: ProductFilters): Promise<Product[]>
  findById(id: string): Promise<Product | null>
  findByBarcode(barcode: string): Promise<Product | null>
  save(product: Product): Promise<void>
  delete(id: string): Promise<void>
}
```

Implementações ao longo do projeto:

```text
InMemoryRepository: testes e primeira Home
SQLiteRepository: operação real
ApiRepository: futuro backend
```

Use cases esperados:

```text
CreateProduct, UpdateProduct, FindProductByBarcode,
RegisterStockEntry, RegisterStockExit, AdjustStock,
CreateCombo, ApplyComboMovement, StartSale,
AddItemToSale, CompleteSale, CancelSale, GetDashboardSummary
```

Finalizar uma venda deve, em uma transação:

```text
validar carrinho
validar estoque
criar Sale
criar SaleItems
criar InventoryMovements
atualizar quantidades
registrar evento de outbox futuro
confirmar
```

Se falhar, nada fica parcialmente salvo. Não permitir estoque negativo acidentalmente.

---

## 9. SQLite offline-first

SQLite é a fonte operacional local. A UI responde do banco local, mesmo sem internet. Usar migrations reproduzíveis, repositories isolados, transações e soft delete quando necessário para sync.

Tabelas iniciais:

```text
stores, categories, products, inventory_movements,
combos, combo_items, sales, sale_items, app_settings
```

Depois:

```text
suppliers, customers, purchases, purchase_items,
cash_sessions, cash_entries, expenses, sync_outbox, sync_metadata
```

Seed de demonstração deve ser separado do fluxo de produção. O app não pode depender de dados fake.

---

## 10. Scanner e QR

Criar uma porta de scanner com startScan, stopScan e onCodeDetected. O domínio não conhece câmera ou plugin.

Produto conhecido: escanear, encontrar, oferecer Entrada, Saída, Adicionar à venda e Ver produto.

Produto desconhecido: informar não cadastrado e abrir cadastro com barcode preenchido.

Combo usa payload versionado e opaco:

```text
app:v1:combo:<UUID>
```

O QR não guarda dados mutáveis; guarda referência ao combo. A saída de combo reduz todos os componentes ou não reduz nenhum.

Plugins de câmera, QR, SQLite, haptics, arquivos e permissões devem funcionar em Android e iOS, ou ser encapsulados por implementações equivalentes.

---

## 11. PDV

```text
Nova venda
→ escanear/pesquisar
→ carrinho
→ ajustar/remover
→ revisar total
→ escolher PIX, dinheiro, cartão ou outro
→ finalizar
```

Requisitos: iniciar e escanear imediatamente; alterar quantidade; validar estoque; manter carrinho; salvar Sale e SaleItems; criar movimentos; atualizar estoque e dashboard; usar transação; preparar cancelamento/estorno futuro. Não implementar integração financeira real.

---

## 12. Módulos

Produtos: CRUD, busca, categorias, barcode, SKU, preços, custo, unidade, validade e estoque mínimo.

Estoque: lista, filtros, entrada, saída, ajuste, histórico, origem, baixo estoque e zerados.

Compras: fornecedores, entrada, custo e movimentações automáticas.

Clientes e fornecedores: cadastro leve e associação opcional; não transformar o MVP em CRM.

Financeiro: caixa, vendas, despesas simples e resumo por período; sem integração bancária.

Relatórios: vendas por período, mais vendidos, margem aproximada, estoque baixo/zerado, estoque parado, entradas/saídas e pagamentos.

---

## 13. Sync e backend futuro

```text
React → Use cases → SQLite local ↔ Sync engine → Spring Boot → PostgreSQL
```

SQLite continua respondendo imediatamente; o backend futuro cuida de backup, usuários, lojas, permissões, múltiplos dispositivos e dados centrais.

### Outbox

```text
sync_outbox:
id, entityType, entityId, operation, payload,
createdAt, attempts, lastAttemptAt, status, lastError
```

Status: PENDING, PROCESSING, SYNCED, FAILED.

Toda mutação local relevante deve poder gerar evento de outbox sem acoplar UI a HTTP.

Contratos futuros:

```text
POST /v1/products
GET /v1/products
PATCH /v1/products/{id}
POST /v1/inventory/movements
POST /v1/sales
GET /v1/sales
POST /v1/combos
POST /v1/sync
```

Documentar conflitos como decisão futura. Não usar “última gravação vence” sem avaliar estoque, vendas e movimentações.

---

## 14. Android, iOS e web

Android: testar scanner, permissões, banco, teclado, back button, navegação e densidades.

iOS: manter compatibilidade desde o primeiro dia; considerar safe areas, câmera, permissões, teclado e navegação. Compilar/publicar exigirá macOS + Xcode, mas a codebase é compartilhada.

Web/PWA: pode existir como fallback, mas scanner e SQLite nativos precisam de adaptação.

---

## 15. Testes e qualidade

### Unitários

Testar criação/edição, busca por barcode, entradas, saídas, estoque insuficiente, estoque mínimo, combos, vendas, cálculos, cancelamento, rollback, QR, filtros e indicadores.

### Integração

Testar migrations, repositories SQLite, transações e persistência após reinício.

### Fluxo principal

```text
abrir → escanear conhecido → registrar saída → conferir histórico
→ iniciar venda → adicionar itens → finalizar → conferir estoque e dashboard
```

### Revisão visual

Em cada milestone de UI, revisar hierarquia, spacing, alinhamento, densidade, touch targets, loading, vazio, erro, sucesso, Android, iOS e larguras 320px, 390px, 430px e tablet.

---

## 16. Milestones

### M0 — Inspeção

Identificar stack, scripts, estado inicial, como rodar lint/typecheck/test/build e preservar alterações existentes.

### M1 — Foundation

Configurar React, TypeScript, Vite, Capacitor, pastas, navegação, tokens, tipografia, ícones, componentes, providers, bootstrap, tema e /dev/ui-kit. Não criar banco ou backend.

### M2 — Home visual

Construir Home mockada com ações, indicadores, alertas, lista e estados loading/vazio/erro. Deve parecer tela final.

### M3 — Domínio

Criar entidades, validações, ports, repositories e use cases sem acoplamento a SQLite ou HTTP.

### M4 — SQLite

Criar conexão, migrations, tabelas, seed de desenvolvimento, transações e repositories. Confirmar persistência após reinício.

### M5 — Produtos

CRUD, busca, categorias, barcode, SKU, preço, custo, unidade, validade e estoque mínimo.

### M6 — Estoque

Entrada, saída, ajuste, devolução, histórico, filtros, alertas e proteção contra saldo inválido.

### M7 — Scanner

Abstração, barcode conhecido/desconhecido, permissões, feedback, fallback manual e compatibilidade de plataforma.

### M8 — Combos

Composição, QR versionado, geração, leitura e movimentação transacional.

### M9 — PDV

Carrinho, scanner, quantidades, total, pagamento local e finalização atômica.

### M10 — Dashboard real

Trocar somente a fonte da Home por dados reais; preservar a UI aprovada.

### M11 — Compras, fornecedores e clientes

Fluxos básicos e movimentações automáticas de compras.

### M12 — Financeiro local

Caixa, vendas, despesas e resumo por período; sem integrações externas.

### M13 — Relatórios

Vendas, margem aproximada, mais vendidos, estoque parado, alertas e pagamentos.

### M14 — Polimento

Acessibilidade, performance, erros, loading, empty states, animações, haptics, safe areas, teclado, offline e recuperação após falha.

### M15 — Backend-ready

Metadados de sync, outbox, status, remote adapter e documentação de contratos. Não subir Spring Boot.

### M16 — Release

Validar build web, Android e, quando houver macOS/Xcode, iOS. Revisar ícone, splash, permissões, nome, versão, armazenamento e distribuição.

---

## 17. Gate obrigatório

Após cada milestone, usar os scripts reais do projeto para executar:

```text
lint
typecheck
test
build
```

Depois:

- corrigir erros;
- investigar warnings;
- remover any, TODO indevido e código morto;
- localizar SQL fora da infraestrutura;
- localizar regras de negócio na UI;
- localizar cores e spacing fora dos tokens;
- revisar duplicação;
- confirmar que rotas e fluxos anteriores continuam funcionando.

Um milestone só termina com os quatro gates aprovados e os critérios de aceite atendidos.

---

## 18. Prompt de operação contínua para o Codex

```text
Você está desenvolvendo um app profissional mobile-first de estoque e vendas para Android e iOS. Leia PLANEJAMENTO_EXECUCAO_APP_GESTAO.md inteiro antes de alterar o projeto e trate-o como especificação principal.

Execute os milestones na ordem. Inspecione o estado atual antes de cada um e preserve alterações existentes.

Use React, TypeScript strict, Vite e Capacitor. Mantenha compatibilidade Android/iOS. Nenhuma feature pode depender exclusivamente de Android sem abstração equivalente.

SQLite é o banco operacional offline permanente, inclusive quando o backend existir. O backend futuro Spring Boot/PostgreSQL será usado para persistência central, backup, usuários, dispositivos e sync.

Nenhum componente React pode executar SQL, importar mocks diretamente ou chamar HTTP diretamente. Use repositories, services e use cases substituíveis. O domínio não depende de React, Capacitor, SQLite ou HTTP.

Use UUIDs geráveis offline. Toda alteração de estoque gera InventoryMovement. Vendas e combos são transacionais: tudo ou nada.

Não implemente backend real, cloud, pagamentos reais, fiscal ou multi-tenant completo antes do milestone correspondente.

Após cada milestone execute lint, typecheck, testes e build. Corrija tudo antes de avançar. Em milestones de UI revise 320px, 390px, 430px e tablet, além de loading, vazio, erro, sucesso, Android e iOS.

Não use any para contornar problemas. Não substitua funcionalidade local implementável por TODO. Não faça refatoração ampla sem necessidade. Se faltar câmera, credencial ou ambiente externo, crie uma abstração/fallback testável, documente a limitação e continue as partes independentes.

Ao terminar cada milestone, informe entregas, áreas afetadas, resultado dos quatro gates, limitações e próximo milestone. Só avance com todos os gates verdes.
```

### Primeira ordem

```text
Execute o M0 e depois o M1: Foundation. Não implemente SQLite, backend ou regras de estoque ainda. Ao terminar, rode lint, typecheck, testes e build; corrija tudo que falhar e só então apresente o resultado.
```

Depois:

```text
Execute o próximo milestone deste planejamento. Preserve o que já funciona, rode os quatro gates obrigatórios e não avance se algum gate falhar.
```

---

## 19. Critérios finais de pronto

O MVP está pronto quando instala e abre no Android, mantém codebase compatível com iOS, funciona sem internet, persiste em SQLite com migrations, cadastra produtos, registra movimentos, lê barcode e QR, cria e movimenta combos, realiza vendas transacionais, atualiza dashboard real, possui testes das regras críticas, possui loading/vazio/erro/sucesso, mantém consistência visual, passa lint/typecheck/test/build, possui outbox e não depende de mock para operações do usuário.

> O usuário deve sentir: “é extremamente fácil de usar, mas existe bastante coisa acontecendo por baixo”.
