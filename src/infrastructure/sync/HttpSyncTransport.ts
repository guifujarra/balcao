import type {
  SyncResult,
  SyncTransaction,
  SyncTransport,
} from '../../application/ports/SyncTransport'
/** Adapter futuro. Não é instanciado pelo aplicativo local e não agenda requisições. */
export class HttpSyncTransport implements SyncTransport {
  private endpoint: URL
  private token: () => Promise<string>
  constructor(baseUrl: string, token: () => Promise<string>) {
    const endpoint = new URL('/v1/sync', baseUrl)
    if (endpoint.protocol !== 'https:') throw new Error('Sincronização remota exige HTTPS.')
    this.endpoint = endpoint
    this.token = token
  }
  async push(transactions: SyncTransaction[], signal?: AbortSignal): Promise<SyncResult> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (await this.token()),
      },
      body: JSON.stringify({ protocolVersion: 1, transactions }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    })
    if (!response.ok)
      throw new Error(
        `Sincronização recusada (${response.status}). A operação local foi preservada.`,
      )
    const data: unknown = await response.json()
    if (
      !data ||
      typeof data !== 'object' ||
      !('acceptedTransactionIds' in data) ||
      !Array.isArray(data.acceptedTransactionIds) ||
      !data.acceptedTransactionIds.every((id) => typeof id === 'string') ||
      !('conflicts' in data) ||
      !Array.isArray(data.conflicts) ||
      !data.conflicts.every(
        (c) =>
          c &&
          typeof c === 'object' &&
          typeof c.transactionId === 'string' &&
          typeof c.reason === 'string',
      )
    )
      throw new Error('Resposta de sincronização inválida.')
    const result = data as SyncResult
    const sent = new Set(transactions.map((t) => t.transactionId))
    if (
      result.acceptedTransactionIds.some((id) => !sent.has(id)) ||
      result.conflicts.some((c) => !sent.has(c.transactionId))
    )
      throw new Error('Confirmação de transação desconhecida.')
    return result
  }
}
