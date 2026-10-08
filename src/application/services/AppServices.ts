import type { CurrentStore } from '../dashboard/DashboardRepository'
import type { GetDashboardSummary } from '../dashboard/GetDashboardSummary'

import type { FilePort } from '../ports/FilePort'
import type { BackupService } from './BackupService'
import type { ScannerPort } from '../ports/ScannerPort'
import type { StoreService } from './StoreService'
export interface AppServices {
  operations: StoreService | null
  backup: BackupService | null
  files: FilePort | null
  scanner: ScannerPort | null
  qr: ((value: string, label?: string) => Promise<string>) | null
  store: CurrentStore
  dashboard: GetDashboardSummary
  dataMode: 'demonstration' | 'local'
}
