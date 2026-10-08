# Entrega operacional — Balcão 0.2.1

Atualização em 3 de outubro de 2026, horário de São Paulo. Os módulos M3–M16 permanecem disponíveis; esta versão recupera a câmera nativa em tela cheia e preserva a praticidade da venda e do cadastro.

## Fluxos atualizados

- Vendas mostra o carrinho. “Escanear produtos” abre a câmera e a primeira leitura válida inicia a venda automaticamente.
- O scanner ocupa a tela inteira, com quadro quadrado de mira e fundo escurecido ao redor. Android usa câmera nativa CameraX/ML Kit, com lanterna quando disponível.
- A câmera permanece aberta. Cada produto gravado produz um aviso compacto por 1,8 segundo e retorno tátil via Haptics no aplicativo. O aviso permite tocar nos controles.
- Frames repetidos não acumulam o mesmo produto enquanto o código permanece na imagem. Afaste o código antes de repetir. Leituras diferentes são processadas em fila.
- “Revisar e finalizar” reúne pagamento, desconto e cliente. Histórico e comprovante permanecem disponíveis.
- O ícone Vendas mostra um badge quando há produtos no carrinho em qualquer tela. O rascunho persiste ao navegar/reabrir.
- A aba Escanear saiu da navegação. “Novo produto” oferece “Ler código de barras” e “Criar produto customizado”.
- Produtos customizados recebem QR próprio; produtos existentes também podem usar seu QR. O código deriva do ID, preservando banco e backups existentes.
- Detalhes de produto/combo permitem compartilhar uma imagem PNG com nome e QR, em 1024 × 1184 px. Android abre o seletor do sistema para WhatsApp, e-mail ou outro app instalado. Navegador oferece download e usa compartilhamento de arquivos quando suportado.

## Entrega e instalação

BALCAO_ANDROID_TESTE.apk: pacote br.com.balcao.app, versão 0.2.1, código 3, Android 8 ou superior. Certificado de desenvolvimento e identidade do app mantidos. A atualização com adb install -r foi verificada sobre a instalação anterior com dados preservados.

Abra o APK no celular e instale como atualização do Balcão existente. Não é necessário apagar dados. O arquivo pode ser transferido pelo meio já usado pelo usuário. A prévia local também oferece o download em /instalar.

BALCAO_FUNCIONAL.zip contém fontes, lockfile, projetos nativos, testes e documentação. Builds, dependências, SDKs e relatórios temporários ficam fora do ZIP. BALCAO_ARQUIVOS.json registra hashes e confirma que os assets do APK correspondem ao build web validado.

Android usa sete plugins Capacitor, incluindo ML Kit com modelo embarcado para leitura offline. iOS mantém seis plugins SPM e o fallback de câmera pelo WebView em tela cheia, sem IPA por falta de macOS/Xcode.

## Verificação

- ESLint, TypeScript strict, 52 testes em 16 arquivos e build web.
- Interface: 39 cenários aprovados na regressão desta atualização; um teste de vídeo sintético inaplicável no WebKit. Cobertura de navegação, operações, cadastro por código/customizado, PNG exportado, badge persistente, checkout, acessibilidade e layouts 320/390/430/768/1440 px.
- Vídeo sintético em Chromium lê o PNG realmente gerado, confirma adição, mantém a câmera, impede duplicata com QR parado, repete após afastar e encerra o track ao sair.
- O mesmo teste de vídeo sintético é inaplicável no runner WebKit por depender de canvas.captureStream. O cadastro, QR, entrada manual, venda e persistência são verificados nos dois motores.
- Android 13/WebView 101: cadastro customizado offline, PNG binário, seletor de compartilhamento, chamada real de Haptics.notification depois de adicionar, venda, reabertura, SQLite, backup, sessão CameraX nativa em tela cheia e encerrada pelo botão voltar. ML Kit reconheceu o QR exportado offline. O fluxo contínuo no APK recebeu eventos nativos injetados com esse resultado, verificando o aviso, as duas chamadas de Haptics e a proteção contra duplicatas. Isso não substitui o teste de leitura física pela lente no celular.
- Offline web: dois testes aprovados (Chromium/WebKit), com abertura e gravação/reabertura com origem desligada. Chromium também usa setOffline. A limitação do runner WebKit com service workers permanece documentada no [issue oficial #42775](https://github.com/microsoft/playwright/issues/42775).

Resultados Android e capturas: docs/qa/android. Capturas da nova experiência: docs/qa/vendas. Regras e transações incluem rollback, ausência de estoque negativo, centavos, snapshots e idempotência.

## Roteiro no celular

1. Abra Estoque → Novo produto → Criar produto customizado. Informe nome, preço e saldo; salve.
2. Compartilhe seu QR pela ação dos detalhes. Imprima ou exiba a imagem em outra tela.
3. Abra Vendas → Escanear produtos e permita a câmera. Leia o QR/barcode. Confira aviso e vibração; continue lendo produtos.
4. Afaste o código para ler o mesmo produto novamente. Toque em Ver carrinho e revise quantidades.
5. Navegue por outras telas para conferir o badge e retorne à venda.
6. Revise e finalize; confira estoque/histórico. Exporte backup em Configurações.

O tato e a leitura física sob diferentes luzes/câmeras ainda precisam de validação no aparelho do usuário. A chamada nativa, o reconhecimento de imagem pelo ML Kit e a sessão CameraX do emulador foram verificados. Não há build iOS neste ambiente.

Banco e backup continuam locais. Não há conta, servidor, sincronização entre dispositivos, cobrança PIX/cartão ou emissão fiscal. O financeiro registra recebimentos informados pelo operador. O APK é uma versão de teste.
