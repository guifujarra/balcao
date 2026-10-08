import type {
  CurrentStore,
  DashboardSummary,
} from '../../application/dashboard/DashboardRepository'

const stockLabels = { available: 'Em estoque', low: 'Estoque baixo', empty: 'Sem estoque' } as const
const stockTones = { available: 'success', low: 'warning', empty: 'danger' } as const

export function presentDashboard(summary: DashboardSummary, store: CurrentStore) {
  const number = new Intl.NumberFormat('pt-BR')
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: store.currency })
  const date = new Date(summary.asOf)
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: store.timezone,
    }).format(date),
  )
  return {
    greeting: hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite',
    dateLabel: new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      timeZone: store.timezone,
    }).format(date),
    salesLabel: money.format(summary.salesTodayCents / 100),
    salesDetail: `${number.format(summary.completedSalesCount)} ${summary.completedSalesCount === 1 ? 'venda realizada' : 'vendas realizadas'}`,
    productCountLabel: number.format(summary.productCount),
    lowStockLabel: number.format(summary.lowStockCount),
    outOfStockLabel: number.format(summary.outOfStockCount),
    expiringLabel: number.format(summary.expiringSoonCount),
    expirationDetail: `Em até ${number.format(summary.expirationWindowDays)} dias`,
    hasProducts: summary.productCount > 0,
    recentProducts: summary.recentProducts.map((product) => ({
      id: product.id,
      name: product.name,
      detail: `${product.category} · ${product.sku}`,
      priceLabel: money.format(product.salePriceCents / 100),
      quantityLabel: `${number.format(product.quantity)} ${product.unitLabel}`,
      status: { label: stockLabels[product.stockStatus], tone: stockTones[product.stockStatus] },
    })),
  }
}
