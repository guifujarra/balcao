# Entrega M2 — Home visual

Data: 29/09/2026. Etapa anterior preservada: M0/M1. Nome provisório: Balcão.

## Entregas

- Home com contexto da loja, saudação e data, ações Vender/Escanear/Produto/Combo, vendas do dia, produtos cadastrados, alertas de estoque baixo/zerado/validade e produtos recentes.
- Estados de carregamento, vazio, erro e recuperação por nova tentativa. Ações rápidas continuam disponíveis durante a consulta.
- Fonte de demonstração isolada na infraestrutura, acessada por contrato, serviço e injeção no bootstrap. Valores identificados como ilustrativos.
- Componentes `ActionTile` e `StatusTile` no design system e no UI Kit. Links no UI Kit permitem inspecionar os estados da Home.
- Navegação dos atalhos com contexto de cadastro, filtro e produto. Os destinos permanecem prévias das etapas operacionais.
- Layouts claros/escuros, mobile e desktop; textos, formatação monetária e data no fuso da loja fora do JSX.

## Áreas afetadas

`application/dashboard`, `application/services`, `infrastructure/demo`, composição e providers em `app`, `features/home`, componentes e estilos do design system, UI Kit e testes. A tela inicial da foundation foi substituída pela Home do M2. A preferência de tema, diálogos e demais rotas foram preservados.

## Validação

| Verificação         | Resultado                                              |
| ------------------- | ------------------------------------------------------ |
| `pnpm lint`         | Aprovado, sem warnings do código                       |
| `pnpm typecheck`    | Aprovado                                               |
| `pnpm test`         | 21 testes aprovados em 6 arquivos                      |
| `pnpm build`        | Aprovado                                               |
| `pnpm test:e2e`     | 26 testes aprovados em Chromium e WebKit               |
| `pnpm format:check` | Aprovado                                               |
| Capacitor sync      | Build copiado e plugins sincronizados em Android e iOS |

Os testes cobrem apresentação dos indicadores, formatação em centavos, data no fuso da loja, cancelamento da consulta, estados, recuperação, navegação com contexto, tema, foco e acessibilidade automatizada. A revisão responsiva cobre 320, 390, 430, 768 e 1440 px; os quatro estados da Home são verificados em 320, 390, 430 e 768 px nos dois motores.

As capturas selecionadas estão em `docs/qa/m2/`. A aprovação automatizada de acessibilidade não substitui testes com leitores de tela e aparelhos reais.

No ambiente Windows restrito, os testes de navegador chegaram ao fim, mas o runner não encerrou seus processos. A suíte foi executada novamente com permissão para gerenciar esses processos. O aviso de cores `NO_COLOR`/`FORCE_COLOR` vem do ambiente herdado e não afeta o aplicativo.

## Limites e continuidade

Os dados da Home são demonstrativos. Ainda não há cadastro operacional, vendas reais, câmera, SQLite, backend, APK ou IPA. A sincronização nativa copia o build web e configura plugins; não equivale à compilação e execução em aparelhos. WebKit no Windows também não equivale a um teste no iPhone.

Próximo milestone: **M3 — Domínio**, com entidades, validações, ports, repositories e casos de uso independentes de React, Capacitor, SQLite e HTTP. O adapter de demonstração deve continuar substituível para a futura Home com dados reais.
