import type { StoreRepository } from '../repositories/StoreRepository'
export class BackupService {
  private repository: StoreRepository
  constructor(repository: StoreRepository) {
    this.repository = repository
  }
  async export() {
    return JSON.stringify(
      {
        format: 'balcao-backup',
        version: 1,
        exportedAt: new Date().toISOString(),
        state: await this.repository.read(),
      },
      null,
      2,
    )
  }
  async restore(contents: string) {
    const { parseBackup } = await import('./backupValidation')
    await this.repository.restoreEmpty(parseBackup(contents))
  }
}
