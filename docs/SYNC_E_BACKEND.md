# Contrato preparado para sincronização futura

O aplicativo funciona somente com seu banco local. Nenhum servidor, autenticação, sincronização automática ou pagamento externo foi configurado.

Toda mutação de domínio gera eventos em `sync_outbox` na mesma transação SQLite dos registros operacionais. Eventos da mesma operação compartilham `transactionId`. Eles mantêm UUID, entidade, operação, payload, data, tentativas e status. Estados previstos: PENDING, PROCESSING, SYNCED e FAILED. Registros de domínio mantêm versão, datas, soft delete e syncStatus.

`HttpSyncTransport` é um adapter preparado, sem instância no bootstrap. Recebe uma URL HTTPS e um provedor de token no futuro. Envia transações para `POST /v1/sync`; não altera banco nem confirma eventos por conta própria. Falhas e respostas desconhecidas são rejeitadas.

## Protocolo proposto

```json
{
  "protocolVersion": 1,
  "transactions": [
    {
      "transactionId": "UUID da operação local",
      "storeId": "UUID da loja",
      "mutations": [
        {
          "eventId": "UUID idempotente",
          "entityType": "products",
          "entityId": "UUID da entidade",
          "operation": "UPSERT",
          "version": 2,
          "payload": {}
        }
      ]
    }
  ]
}
```

Resposta: `acceptedTransactionIds` e `conflicts: [{ transactionId, reason }]`. O servidor deverá aceitar ou rejeitar a transação inteira, de forma idempotente. Uma venda não pode ter sua quantidade aceita e seus movimentos rejeitados. Eventos anteriores ao agrupamento precisam de migração explícita antes de sincronizar.

Rotas REST futuras: POST/GET/PATCH /v1/products, POST /v1/inventory/movements, POST/GET /v1/sales e POST /v1/combos.

## Decisões ainda necessárias

- Autenticação, autorização por loja, identidade do dispositivo e revogação.
- Reconciliação por versão; não usar última gravação vence em saldo, vendas ou movimentos.
- Dedupliação de eventId e transactionId no backend.
- Política de conflito de catálogo, reservas e vendas simultâneas em aparelhos diferentes.
- Download incremental, tombstones, checkpoints, recuperação de PROCESSING após falha, retenção e compactação da outbox.
- A transação local continua respondendo imediatamente; falha remota nunca apaga a operação local.

SQLite continua sendo o banco operacional quando Spring Boot/PostgreSQL forem adicionados. A fila atual é preparação de contrato, não uma promessa de backup na nuvem.
