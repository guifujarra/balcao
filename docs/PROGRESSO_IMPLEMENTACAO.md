# Implementação operacional

Atualizado em 3 de outubro de 2026, horário de São Paulo.

M0–M16 implementados conforme os registros históricos. A versão 0.2.1 recupera o scanner nativo Android em tela cheia com quadro de mira. Mantém os ajustes da versão 0.2.0:

- Venda iniciada na primeira leitura, câmera contínua, aviso breve e vibração após gravar.
- Carrinho como foco, revisão do checkout, histórico em modal e badge global.
- Cadastro por leitura ou criação customizada; scanner dentro desses fluxos.
- QR próprio de produto e exportação PNG de produto/combo pelo compartilhamento do sistema.

O scanner permite digitar, retomar a câmera e voltar ao carrinho sem perder itens. A lanterna aparece quando a câmera oferece suporte. Abertura e encerramento são serializados, incluindo cancelamento durante a permissão.

Identidade Android, assinatura de teste e banco preservados. Nenhuma migration necessária. A loja de produção continua vazia na primeira instalação.

52 testes unitários/de componentes, análise estática e build aprovados. A regressão aprovou 39 cenários em Chromium/WebKit e dois cenários offline. O teste de vídeo sintético executa apenas no Chromium. Android verificou QR em PNG, compartilhamento, Haptics, operações offline e persistência; câmera CameraX real do emulador e reconhecimento do PNG pelo ML Kit offline. Eventos de leitura injetados verificaram adições sucessivas na interface nativa. A leitura física pela lente ainda deve ser conferida no celular.

Entrega: APK 0.2.1, código 3, e fontes atualizados. Android usa sete plugins. iOS mantém seis plugins SPM e fallback de vídeo em tela cheia; compilação depende de macOS/Xcode. Backend e sincronização permanecem como etapa posterior.

Detalhes e limites: [ENTREGA_OPERACIONAL.md](ENTREGA_OPERACIONAL.md).
