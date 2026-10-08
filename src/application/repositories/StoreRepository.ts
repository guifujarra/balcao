import type { StoreState } from '../../domain/model'
export interface StoreRepository {
  read(): Promise<StoreState>
  restoreEmpty(state: StoreState): Promise<void>
  transaction<T>(operation: (state: StoreState) => T): Promise<T>
}
export interface Runtime {
  id(): string
  now(): string
}
