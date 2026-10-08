import type { AppServices } from '../../application/services/AppServices'
import { GetDashboardSummary } from '../../application/dashboard/GetDashboardSummary'
import {
  DemoDashboardRepository,
  type DemoScenario,
} from '../../infrastructure/demo/DemoDashboardRepository'

export function createDemoServices(scenario: DemoScenario = 'ready', delay = 280): AppServices {
  return {
    operations: null,
    backup: null,
    files: null,
    scanner: null,
    qr: null,
    store: {
      id: '3a18345e-b42c-42e0-a3bf-d7ef517ec14c',
      name: 'Mercearia da Esquina',
      currency: 'BRL',
      timezone: 'America/Sao_Paulo',
    },
    dashboard: new GetDashboardSummary(new DemoDashboardRepository(scenario, delay)),
    dataMode: 'demonstration',
  }
}
