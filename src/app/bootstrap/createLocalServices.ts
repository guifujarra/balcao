import { files } from '../../platform/files/files'
import { BackupService } from '../../application/services/BackupService'
import { makeQr } from '../../platform/qr/qr'
import { BarcodeScanner } from '../../platform/barcode/scanner'
import { createRepository } from '../../infrastructure/database/createRepository'
import { StoreService } from '../../application/services/StoreService'
import { runtime } from '../../platform/storage/runtime'
import { GetDashboardSummary } from '../../application/dashboard/GetDashboardSummary'
import { LocalDashboardRepository } from '../../application/dashboard/LocalDashboardRepository'
import type { AppServices } from '../../application/services/AppServices'
export async function createLocalServices(): Promise<AppServices> {
  const repository = await createRepository()
  const operations = new StoreService(repository, runtime)
  const store = await operations.initialize()
  return {
    operations,
    backup: new BackupService(repository),
    files,
    scanner: new BarcodeScanner(),
    qr: makeQr,
    store,
    dataMode: 'local',
    dashboard: new GetDashboardSummary(new LocalDashboardRepository(operations)),
  }
}
