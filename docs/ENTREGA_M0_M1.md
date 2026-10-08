# Entrega M0 + M1 — 29/09/2026

## Escopo e situação inicial

O planejamento foi lido integralmente. Como o diretório da conversa estava vazio e não havia projeto cadastrado no aplicativo, a base foi criada em `outputs/app-gestao`. Não existiam arquivos de aplicação, repositório Git, scripts de validação ou alterações do usuário a preservar. Nenhum `AGENTS.md` aplicável foi encontrado nos diretórios ancestrais.

A entrega segue o ponto inicial previsto no documento: **M0 e M1**. Não corresponde ao MVP completo nem à conclusão dos milestones posteriores.

## Entregas

- React 19, TypeScript strict, Vite, Capacitor 8, lockfile e scripts reproduzíveis.
- Projetos Android e iOS gerados pelo Capacitor; plugins oficiais App e Preferences em ambas as plataformas.
- Bootstrap e providers de tema, notificações e recuperação de falha de renderização.
- Navegação Início, Estoque, Escanear, Vendas e Mais; rotas dos sete módulos de Mais e recuperação para endereço inexistente.
- Tela inicial de acolhimento, destinos sinalizados como prévia e Configurações de aparência funcional.
- Tokens de cor, fonte, espaçamento, forma, bordas, elevação, movimento e foco; temas claro, escuro e automático.
- Fonte Manrope local e ícones Lucide; sem CDN para renderizar a interface.
- UI Kit em `/dev/ui-kit`: Button, IconButton, Input, SearchField, Select, NumberField, ProductRow, ProductCard, Badge, StatCard, Alert, Modal, BottomSheet, Toast, Tabs, EmptyState, LoadingState, ErrorState, ConfirmDialog e ScannerOverlay. A tipografia e o sistema de cores também têm exemplos próprios.
- Fallback manual e estados do scanner demonstrados visualmente; não é uma leitura real de câmera.
- Preferência de tema salva por porta de armazenamento; aviso quando a gravação é bloqueada.
- Safe areas, barras do sistema sincronizadas com o tema e tratamento do botão voltar Android encapsulado.
- Manifesto de privacidade para Preferences incluído nos recursos iOS.

## Gates executados

| Verificação        | Resultado                                |
| ------------------ | ---------------------------------------- |
| `pnpm lint`        | Aprovado, zero warnings do ESLint        |
| `pnpm typecheck`   | Aprovado, TypeScript strict              |
| `pnpm test`        | Aprovado, 14 testes em 4 arquivos        |
| `pnpm build`       | Aprovado, bundle de produção gerado      |
| `pnpm test:e2e`    | Aprovado, 16 testes em Chromium e WebKit |
| `pnpm peers check` | Sem conflitos de peer dependencies       |

O bundle principal ficou em aproximadamente 296 kB / 94 kB gzip, e o UI Kit em chunk separado de aproximadamente 21 kB / 6 kB gzip. Esses tamanhos são os valores deste build, não um orçamento futuro de performance.

Os testes cobrem navegação, recuperação de rota, campos e descrições de erro, preservação de dados digitados, abas por teclado, bloqueio de ações durante loading, confirmação/cancelamento, busca de exemplo, scanner manual de demonstração, toast, preferência de aparência e falha de persistência.

## Revisão visual e acessibilidade

Rotas Início, Mais, Configurações e UI Kit avaliadas em **320, 390, 430, 768 e 1440 px**, nos motores Chromium e WebKit. Testes verificam ausência de overflow horizontal e ausência de violações detectadas pelo axe nos critérios WCAG A/AA selecionados. Isso não substitui uma auditoria completa com leitor de tela.

Também foram verificados tema escuro, estados vazio/carregando/erro/sucesso, bottom sheet, ciclo de foco no modal, fechamento com Escape e retorno ao acionador. Foram corrigidos um rótulo ARIA das notificações, o contraste de texto secundário e o comportamento de foco em WebKit. A inspeção de imagens revelou diferença no peso da fonte variável nesse motor; a família foi preservada com arquivos estáticos, conferidos visualmente.

Capturas selecionadas estão em `docs/qa/`; o relatório completo pode ser regenerado com `pnpm test:e2e`.

## Limitações explícitas

- Nenhum APK/IPA foi compilado ou instalado nesta etapa. O SDK Android disponível tinha plataformas até 35, enquanto o projeto gerado usa 36. Não foi alterado o SDK alvo para acomodar o ambiente.
- iOS foi preparado com Swift Package Manager; build, assinatura e teste no iPhone precisam de macOS + Xcode/aparelho.
- Chromium e WebKit em tamanhos móveis são verificação da camada web. Teclado nativo, safe areas reais, botão voltar físico e retomada do processo precisam de validação em dispositivo.
- A aplicação ainda não possui banco, cadastro de produtos, regras de estoque, pagamentos, câmera, QR operacional, sync ou outbox. Essas funcionalidades permanecem nas etapas do planejamento.
- Não há service worker/PWA nesta entrega. A versão web servida pelo Vite não oferece reabertura offline. Fontes e assets estão empacotados para uso no contêiner nativo.
- Nome, identificador de pacote, ícone e splash ainda são provisórios. A revisão de distribuição pertence ao M16.
- Avisos de instalação e ambiente investigados estão documentados em `ARQUITETURA.md`; não foram silenciados por alterações incompatíveis de dependências.

## Próxima etapa

**M2 — Home visual.** Substituir a tela de acolhimento por uma Home com saudação, ações Vender/Escanear/Produto/Combo, indicadores e alertas, alimentada por um contrato e um adapter de demonstração fora do React. Preservar a navegação, os tokens e os componentes desta base. Ao terminar, executar novamente os quatro gates e a revisão visual antes de iniciar o domínio (M3).
