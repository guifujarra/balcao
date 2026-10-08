import type { DashboardRepository } from './DashboardRepository'

/** Ponto de entrada estável; a fonte poderá ser trocada por SQLite no M10. */
export class GetDashboardSummary {
  private readonly repository: DashboardRepository

  constructor(repository: DashboardRepository) {
    this.repository = repository
  }

  execute(signal?: AbortSignal) {
    return this.repository.getSummary(signal)
  }
}
