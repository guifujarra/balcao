export interface CurrentStore {
  id: string
  name: string
  currency: string
  timezone: string
}

export interface DashboardProduct {
  id: string
  name: string
  sku: string
  category: string
  salePriceCents: number
  quantity: number
  unitLabel: string
  stockStatus: 'available' | 'low' | 'empty'
}

/** Read model da Home. Não é uma entidade de estoque nem uma fonte para mutações. */
export interface DashboardSummary {
  asOf: string
  salesTodayCents: number
  completedSalesCount: number
  productCount: number
  lowStockCount: number
  outOfStockCount: number
  expiringSoonCount: number
  expirationWindowDays: number
  recentProducts: DashboardProduct[]
}

export interface DashboardRepository {
  getSummary(signal?: AbortSignal): Promise<DashboardSummary>
}
