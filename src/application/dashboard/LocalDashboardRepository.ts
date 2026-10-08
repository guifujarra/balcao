import type { DashboardRepository, DashboardSummary } from './DashboardRepository'
import type { StoreService } from '../services/StoreService'
import { active } from '../../domain/model'
import { dayInZone } from '../../domain/rules'
export class LocalDashboardRepository implements DashboardRepository {
  private service: StoreService
  private now: () => string
  constructor(service: StoreService, now = () => new Date().toISOString()) {
    this.service = service
    this.now = now
  }
  async getSummary(signal?: AbortSignal): Promise<DashboardSummary> {
    signal?.throwIfAborted()
    const data = await this.service.read()
    signal?.throwIfAborted()
    const asOf = this.now()
    const today = dayInZone(asOf, data.stores[0]?.timezone)
    const until = new Date(`${today}T12:00:00Z`)
    until.setUTCDate(until.getUTCDate() + 7)
    const products = active(data.products)
    const sales = data.sales.filter(
      (s) =>
        s.status === 'COMPLETED' &&
        s.completedAt &&
        dayInZone(s.completedAt, data.stores[0]?.timezone) === today,
    )
    return {
      asOf,
      salesTodayCents: sales.reduce((sum, s) => sum + s.total, 0),
      completedSalesCount: sales.length,
      productCount: products.length,
      lowStockCount: products.filter((p) => p.quantity > 0 && p.quantity <= p.minimumStock).length,
      outOfStockCount: products.filter((p) => p.quantity === 0).length,
      expiringSoonCount: products.filter(
        (p) =>
          p.quantity > 0 &&
          p.expirationDate &&
          p.expirationDate <= until.toISOString().slice(0, 10),
      ).length,
      expirationWindowDays: 7,
      recentProducts: products
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || p.barcode || 'Sem código',
          category: data.categories.find((c) => c.id === p.categoryId)?.name ?? 'Sem categoria',
          salePriceCents: p.salePrice,
          quantity: p.quantity,
          unitLabel: p.unit,
          stockStatus:
            p.quantity === 0 ? 'empty' : p.quantity <= p.minimumStock ? 'low' : 'available',
        })),
    }
  }
}
