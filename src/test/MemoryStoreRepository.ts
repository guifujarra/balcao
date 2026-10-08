import { emptyState, type StoreState } from '../domain/model'
import type { StoreRepository } from '../application/repositories/StoreRepository'
export class MemoryStoreRepository implements StoreRepository {
  private state = emptyState()
  async restoreEmpty(state: StoreState) {
    if (this.state.products.length) throw new Error('A loja precisa estar vazia.')
    this.state = structuredClone(state)
  }
  async read() {
    return structuredClone(this.state)
  }
  async transaction<T>(operation: (state: StoreState) => T) {
    const next = await this.read()
    const result = operation(next)
    this.state = next
    return structuredClone(result)
  }
}
