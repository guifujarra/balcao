import type {
  DashboardRepository,
  DashboardSummary,
} from '../../application/dashboard/DashboardRepository'

export type DemoScenario = 'ready' | 'empty' | 'error' | 'loading' | 'retry'

export function readDemoScenario(value: string | null): DemoScenario {
  return value === 'empty' || value === 'error' || value === 'loading' || value === 'retry'
    ? value
    : 'ready'
}

function waitForPreview(delay: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Consulta cancelada', 'AbortError'))
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Consulta cancelada', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, delay)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** Fixture isolada. Nenhum dado deste adapter é salvo como dado operacional. */
export class DemoDashboardRepository implements DashboardRepository {
  private readonly scenario: DemoScenario
  private readonly delay: number
  private failedOnce = false
  private readonly now: () => Date

  constructor(scenario: DemoScenario = 'ready', delay = 280, now: () => Date = () => new Date()) {
    this.scenario = scenario
    this.delay = delay
    this.now = now
  }

  async getSummary(signal?: AbortSignal): Promise<DashboardSummary> {
    await waitForPreview(this.scenario === 'loading' ? 30_000 : this.delay, signal)
    if (this.scenario === 'error' || (this.scenario === 'retry' && !this.failedOnce)) {
      this.failedOnce = true
      throw new Error('Falha demonstrativa ao consultar o resumo')
    }
    const empty: DashboardSummary = {
      asOf: this.now().toISOString(),
      salesTodayCents: 0,
      completedSalesCount: 0,
      productCount: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      expiringSoonCount: 0,
      expirationWindowDays: 7,
      recentProducts: [],
    }
    if (this.scenario === 'empty') return empty
    return {
      ...empty,
      salesTodayCents: 128450,
      completedSalesCount: 23,
      productCount: 128,
      lowStockCount: 7,
      outOfStockCount: 3,
      expiringSoonCount: 4,
      recentProducts: [
        {
          id: '572504be-868a-4195-a568-a2a89996ef38',
          name: 'Café especial',
          sku: 'CAF-001',
          category: 'Mercearia',
          salePriceCents: 1890,
          quantity: 24,
          unitLabel: 'un.',
          stockStatus: 'available',
        },
        {
          id: 'e4126ae1-3a96-4a57-bec6-569591dd77fd',
          name: 'Leite integral',
          sku: 'LEI-001',
          category: 'Laticínios',
          salePriceCents: 549,
          quantity: 5,
          unitLabel: 'un.',
          stockStatus: 'low',
        },
        {
          id: '4361c925-a858-4899-bc0c-eb7a1c2a3496',
          name: 'Arroz branco 5 kg',
          sku: 'ARR-005',
          category: 'Mercearia',
          salePriceCents: 2490,
          quantity: 0,
          unitLabel: 'un.',
          stockStatus: 'empty',
        },
        {
          id: 'b62f1df3-bca9-40b0-8b46-dc5c6e98e067',
          name: 'Sabonete de erva-doce',
          sku: 'SAB-003',
          category: 'Cuidados pessoais',
          salePriceCents: 350,
          quantity: 18,
          unitLabel: 'un.',
          stockStatus: 'available',
        },
      ],
    }
  }
}
