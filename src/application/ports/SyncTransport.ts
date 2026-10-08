export interface SyncMutation {
  eventId: string
  entityType: string
  entityId: string
  operation: 'UPSERT' | 'DELETE'
  version: number
  payload: unknown
}
export interface SyncTransaction {
  transactionId: string
  storeId: string
  mutations: SyncMutation[]
}
export interface SyncResult {
  acceptedTransactionIds: string[]
  conflicts: { transactionId: string; reason: string }[]
}
export interface SyncTransport {
  push(transactions: SyncTransaction[], signal?: AbortSignal): Promise<SyncResult>
}
