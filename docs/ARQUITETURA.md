# Arquitetura do Balcão

## Composição e responsabilidade

O bootstrap escolhe adapters de plataforma, migra o banco, inicializa uma loja vazia e injeta os serviços. A interface consulta serviços e portas; não executa SQL nem acessa HTTP.

```text
Features React e hooks
  → StoreService / leitura de dashboard / relatórios / BackupService
  → StoreRepository / ScannerPort / FilePort / PreferenceStorage
  → SQLite nativo ou WASM, scanner e arquivos de plataforma
```

O domínio mantém entidades, validações, moeda em centavos, quantidades com até três casas e QR versionado. Não importa React, Capacitor, SQLite ou rede. UUIDs são gerados offline por fonte criptográfica.

`StoreService` reúne os casos de uso locais para manter a transação de operações compostas explícita. Repositories individuais por entidade não foram criados artificialmente: `StoreRepository.transaction` fornece uma unidade de trabalho coerente para vendas, compras e combos.

Os componentes reutilizam tokens, Manrope empacotada e Lucide. Os hooks controlam loading, erro, mutations e atualização após commit. Campos inválidos permanecem preenchidos. As rotas de contatos usam a mesma apresentação com tipos de cliente/fornecedor.

## Persistência e migrations

A migration 1 cria tabelas por entidade, índices por loja, unicidade de barcode/SKU ativo, `app_settings`, `sync_metadata` e `schema_migrations`. Bancos com uma versão mais recente são recusados, evitando uma interpretação silenciosa de schema desconhecido.

Cada tabela operacional tem `id`, `store_id` e `payload` JSON validado pelo SQLite. Essa escolha mantém o modelo tipado simples no MVP; os índices necessários já estão no banco. Não é um schema analítico com uma coluna por campo. Consultas maiores poderão exigir colunas/indexes e modelos de leitura adicionais por migration.

`SqliteStoreRepository` lê registros na ordem de inserção, aplica o caso de uso e grava somente os registros modificados, usando parâmetros SQL. As operações locais preservam históricos e usam soft delete. A restauração exige banco operacional vazio e substitui os registros em uma transação.

`NativeSqlDriver` serializa acessos e usa begin/commit/rollback no plugin SQLite. O banco local se chama `balcaoSQLite.db`, sem criptografia adicional nesta fase.

`WebSqlDriver` usa sql.js e WASM empacotado. Ele lê o snapshot SQLite de IndexedDB, executa a transação SQL e persiste os bytes em uma transação IndexedDB com revisão. Uma comparação da revisão e retries controlados evitam que duas abas sobrescrevam alterações concorrentes. O retorno de sucesso ocorre após persistir os bytes; falhas mantêm o snapshot anterior.

O repository atualmente lê o estado completo, incluindo histórico e outbox. É apropriado para a escala local validada, mas não foi submetido a um teste de carga de anos de operações. Paginação, consultas direcionadas e retenção da outbox devem preceder uso com bases grandes.

## Regras e atomicidade

Salvar um produto valida códigos únicos, preços, categoria, unidade e validade. Estoque inicial sempre gera movimento. Qualquer mudança de saldo cria histórico com quantidade anterior/atual, motivo e origem.

Combos e compras validam todos os componentes e gravam dentro da mesma transação. Finalizar uma venda grava status, saldo, movimentos, caixa e outbox juntos. Falhas de um item desfazem a operação inteira. Uma segunda finalização do mesmo ID retorna a venda concluída sem duplicar baixa ou lançamento. Compras também usam IDs de requisição para idempotência.

A primeira leitura válida cria/reutiliza o DRAFT e adiciona o item em uma única transação. Código desconhecido ou inválido não cria rascunho. O carrinho segue salvo ao navegar para outras telas; o ícone Vendas mostra a quantidade de produtos distintos. O aviso compacto e Haptics ocorrem após o commit. Itens guardam nome, preço e custo do momento em que entraram no carrinho. Cancelamento de rascunho não altera estoque. Estorno de venda concluída permanece uma decisão futura.

Moeda é armazenada em centavos inteiros. Produtos em unidades exigem quantidade inteira; kg/l/m aceitam três casas. Ajuste de estoque informa o saldo contado, não um delta arbitrário. Não se permite estoque negativo.

## Leituras e relatórios

`LocalDashboardRepository` substitui a fonte da Home sem mudar seu contrato visual. Indicadores usam vendas concluídas e o dia no fuso da loja. Validade considera produtos com saldo e vencidos ou com vencimento em até sete dias.

Relatórios usam custos históricos do carrinho. Margem bruta aproximada é a receita após desconto menos esses custos; despesas, taxas e tributos não são deduzidos desse indicador. Ranking por produto mostra receita antes do desconto geral. Estoque parado exige saldo, cadastro antigo e ausência de venda nos 30 dias até o fim do período.

Caixa conta entradas/saídas em dinheiro vinculadas à sessão. PIX/cartão ficam no registro financeiro e nos relatórios. O resumo financeiro por período não é apresentado como lucro contábil.

## Plataforma, navegação e offline

A ScannerPort usa ML Kit/CameraX no Android, com câmera traseira nativa atrás do WebView transparente e modelo de reconhecimento empacotado para uso offline. A interface ocupa a tela inteira, mostra uma mira quadrada, entrada manual, lanterna quando disponível e acesso ao carrinho. Navegador/iOS usam html5-qrcode com vídeo proporcional em tela cheia. O plugin ML Kit é incluído apenas no projeto Android, preservando o SPM do iOS. A referência da integração é https://capawesome.io/docs/sdks/capacitor/mlkit/barcode-scanning/. A sessão da venda permanece aberta após a leitura, com proteção por código contra frames repetidos e fila serial de adições. O alvo mais próximo da mira tem preferência quando há mais de um código na imagem. Abertura, encerramento e reinício são serializados; sair durante uma permissão pendente invalida a sessão e não abre uma câmera atrasada. O aviso e Haptics continuam ocorrendo apenas após gravar. HTTP na rede local apresenta entrada manual. O produto usa `app:v1:produto:<UUID>` e o combo `app:v1:combo:<UUID>`. Esses códigos referenciam registros locais. O QR do produto deriva do ID existente e dispensa migration.

O botão voltar Android encerra a sessão de câmera e retorna ao carrinho, ou fecha o diálogo antes de navegar ou minimizar na Home. Safe areas e barras usam CSS e APIs do Capacitor. Os diálogos têm rolagem com `100vh` e uma regra `@supports` para `100dvh`: o teste nativo encontrou que uma declaração com variáveis e unidade não suportada anulava o limite de altura em WebView 101. O ajuste foi confirmado no APK com teclado aberto.

O aplicativo nativo usa arquivos empacotados e hash routing. No navegador, o build gera cache de assets, fontes e WASM, ativado por service worker em contexto seguro. O worker serve o shell nas navegações e não sincroniza dados. Uma atualização espera o ciclo normal de fechamento das páginas anteriores.

O QR exportado é um PNG de 1024 × 1184 com fundo branco, margem de leitura e nome do produto/combo. FilePort grava base64 binário no cache e abre o compartilhamento nativo; web usa Web Share para arquivos quando disponível, ou download. Cancelar o compartilhamento não produz confirmação de envio. Não há envio automático.

Backup é validado por schema carregado sob demanda e por consistência entre registros. O adapter web baixa o JSON; o nativo escreve no cache e abre o seletor de compartilhamento/salvamento. O usuário escolhe onde guardar; não há envio automático.

## Demonstração e produção

O modo local é o padrão. Apenas parâmetros explícitos `preview=ready|empty|loading|retry|error` selecionam dados de demonstração da Home. A escolha permanece nessa sessão; `preview=off` volta aos dados reais. No nativo, use `/#/?preview=off`.

Fixtures não são gravadas no banco operacional. No modo demonstração, os módulos indicam a prévia; o botão “Usar meus dados” troca para o modo local. Preferences/armazém web de preferências guardam tema, não estoque ou vendas.

## Preparação de backend

Entidades incluem storeId, timestamps, version, syncStatus e deletedAt. Toda mutação relevante grava eventos de outbox na mesma transação dos dados. Eventos novos compartilham `transactionId`; eventos antigos sem esse campo continuam legíveis.

`SyncTransport` e `HttpSyncTransport` definem um futuro envio HTTPS de grupos atômicos. O adapter não é instanciado no bootstrap e não agenda rede. Não há servidor, autenticação, pull, worker de sync ou compartilhamento entre dispositivos. O contrato e as decisões de conflito estão em [SYNC_E_BACKEND.md](SYNC_E_BACKEND.md).

## Compatibilidade e limites da validação

Capacitor 8.5.2, sete plugins Android e seis plugins iOS compõem os projetos nativos. O lockfile faz parte da entrega. O projeto mantém Android mínimo 26. iOS contém manifesto de privacidade para Preferences e Filesystem, mas não foi compilado neste Windows.

A suíte offline WebKit encerra o servidor de origem, mantendo o worker e o banco ativos. Chromium também usa `context.setOffline(true)`. O uso exclusivo desse método no WebKit produz falha até em respostas literais do service worker no runner; o caso está descrito no [issue oficial #42775 do Playwright](https://github.com/microsoft/playwright/issues/42775). O teste não é pulado.

O Gradle reporta avisos `flatDir` da integração gerada Capacitor/Cordova. A árvore do CLI contém a dependência upstream depreciada uuid 7, usada pela ferramenta xcode. Não se aplicou override de major. Avisos NO_COLOR/FORCE_COLOR são do ambiente do runner; nenhum foi mascarado para passar os gates.

O APK debug foi validado em Android 13, com WebView 101. Hardware físico, assinatura de distribuição e iOS permanecem fora da evidência automatizada atual.
