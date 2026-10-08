# Balcão — gestão local de estoque e vendas

Versão de teste **0.2.1**, pacote `br.com.balcao.app`. O aplicativo abre com uma loja vazia e grava operações reais em SQLite. Não precisa de conta ou servidor.

Produtos, movimentos de estoque, scanner, combos com QR, PDV, compras, clientes, fornecedores, caixa, despesas, dashboard e relatórios estão implementados. O APK Android foi compilado, instalado e testado offline em um emulador Android 13. O projeto iOS foi sincronizado; sua compilação depende de macOS/Xcode.

## Executar no computador

Node.js 22.12+ e pnpm 11.19.0. Ambiente validado: Node 24.19.0 e JDK 21.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abra `http://127.0.0.1:5173/`. O UI Kit está em `/dev/ui-kit`. Execute os comandos na pasta `app-gestao`.

## Testar no celular

A entrega inclui `BALCAO_ANDROID_TESTE.apk`, um APK debug instalável em Android 8 ou superior. Abra o arquivo no celular e permita a instalação pelo navegador ou gerenciador de arquivos quando solicitado. A loja começa vazia; os dados de teste automatizado ficam somente no emulador.

Para servir o app e o download do APK na mesma rede:

```sh
pnpm build
pnpm preview:phone
```

Coloque o APK na pasta imediatamente acima de `app-gestao`. Abra `http://IP_DO_COMPUTADOR:4174/instalar` no celular conectado ao mesmo Wi-Fi. O endereço desta máquina na validação foi `http://192.168.1.69:4174/instalar`. Ele pode mudar conforme a rede; mantenha o computador ligado.

No navegador da rede local por HTTP, a digitação de códigos funciona; câmera e cache offline exigem HTTPS ou localhost. O aplicativo Android instalado usa câmera e arquivos empacotados sem depender dessa prévia. No navegador, os dados também persistem entre sessões, mas cada origem possui seu próprio banco.

## O que funciona

| Área          | Operação                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Produtos      | Cadastro por código/customizado, QR próprio exportável, edição, categorias, busca por nome/SKU/barcode, preço, custo, unidade, validade e mínimo |
| Estoque       | Entrada, saída, contagem/ajuste, devolução, histórico, filtros e proteção contra saldo negativo                                                  |
| Scanner       | Câmera contínua dentro da venda/cadastro, aviso breve, vibração e fallback manual                                                                |
| Combos        | Composição, QR versionado e movimentação de todos os componentes em uma transação                                                                |
| Vendas        | Início na primeira leitura, carrinho persistido, badge global, revisão/finalização, histórico                                                    |
| Compras       | Recebimento por fornecedor opcional, custo e entrada automática no estoque                                                                       |
| Contatos      | Clientes e fornecedores com criação, edição, busca e arquivamento                                                                                |
| Financeiro    | Abertura/fechamento de caixa, despesas e resumo por período                                                                                      |
| Relatórios    | Vendas, pagamentos, receita por produto, margem aproximada, estoque parado e movimentos                                                          |
| Configurações | Nome da loja, aparência, exportação e restauração validada de backup                                                                             |

PIX/cartão representam o pagamento registrado pelo operador; o aplicativo não cobra ou processa pagamentos. O comprovante é local, sem valor fiscal. O preço do combo é uma referência para sua movimentação; a venda pelo PDV usa os itens do carrinho.

O recebimento de compra atualiza estoque e custo. O pagamento dessa compra pode ser registrado como despesa no financeiro. O saldo de caixa considera dinheiro; relatórios distinguem receita, despesa e margem bruta aproximada.

## Dados e backup

No Android/iOS, o adapter usa SQLite nativo. No navegador, SQLite WASM é persistido em IndexedDB. Preferências de tema são separadas do banco operacional.

Os dados ficam em cada instalação; ainda não há sincronização entre computador e celular. Em Configurações, exporte um backup JSON e salve o arquivo em um local escolhido por você. O arquivo temporário de exportação nativa, sozinho, não substitui um backup salvo fora do aplicativo.

A restauração valida versão, identificadores, saldos, histórico, totais, referências, datas e QR. Ela só aceita uma instalação sem cadastros ou operações e preserva os IDs do arquivo. Não mescla lojas ou bancos existentes. Faça backup antes de limpar dados ou desinstalar.

No build web em contexto seguro, um service worker guarda os arquivos para reabertura offline após o primeiro carregamento completo. As operações não esperam a rede. A outbox local prepara uma futura sincronização; não dispara requisições hoje.

## Validação

```sh
pnpm check
pnpm exec playwright install chromium webkit
pnpm test:e2e
pnpm test:offline
pnpm format:check

# Emulador dedicado com o APK debug já instalado:
# Defina ANDROID_HOME e, opcionalmente, BALCAO_ANDROID_SERIAL.
pnpm test:android
```

Resultado da atualização: **52 testes unitários/de componentes** e build aprovados. Interface e offline são verificados em Chromium/WebKit. O teste Android confirmou cadastro/venda offline, PNG de QR, painel de compartilhamento, chamada de Haptics, reabertura, SQLite, backup, CameraX em tela cheia, leitura do QR exportado por ML Kit offline e encerramento da câmera. Os resultados e limites da suíte de interface estão no registro operacional.

Os testes verificam Chromium/WebKit, 320/390/430/768/1440 px, acessibilidade automatizada, foco, tema e rollback das operações críticas. WebKit é uma aproximação de Safari, não uma execução no iPhone. Capturas selecionadas ficam em `docs/qa/operacional` e `docs/qa/android`.

Ainda precisam de aparelho físico: leitura real de barcode/QR, diferenças de câmera/teclado por fabricante, feedback tátil e uso prolongado. iOS precisa ser compilado e testado no macOS/Xcode.

## Android e iOS

```sh
pnpm native:sync
pnpm android
# No macOS:
pnpm ios
```

Android: compileSdk/targetSdk 36, minSdk 26, JDK 21 e Gradle Wrapper. Para gerar o APK: na pasta `android`, execute `gradlew.bat assembleDebug` no Windows ou `./gradlew assembleDebug` em macOS/Linux.

Android usa sete plugins, incluindo ML Kit para leitura contínua com câmera CameraX em tela cheia e quadro de mira. O modelo de leitura vem no APK e funciona offline. O iOS mantém seis plugins SPM e usa vídeo no WebView como fallback de scanner. O iOS usa Swift Package Manager, descrição de câmera e manifesto de privacidade para Preferences/Filesystem. Ícones e splash foram preparados; `node scripts/native-icons.mjs` exporta os assets iOS a partir da marca SVG. Não foi gerado IPA.

O APK entregue usa assinatura de desenvolvimento. Publicação nas lojas, chave de distribuição, autenticação, backend, sync entre dispositivos e integrações fiscal/bancária pertencem às próximas fases.

Consulte [a arquitetura](docs/ARQUITETURA.md), [o registro operacional](docs/ENTREGA_OPERACIONAL.md), [a preparação de sync](docs/SYNC_E_BACKEND.md) e [o planejamento original](docs/PLANEJAMENTO_EXECUCAO_APP_GESTAO.md). Os registros M0/M1/M2 são históricos.
