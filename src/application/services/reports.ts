import { active, type StoreState, type CashSession } from '../../domain/model'
import { dateOnly, dayInZone, requireThat } from '../../domain/rules'
export function defaultPeriod(now = new Date().toISOString()) {
  const to = dayInZone(now)
  return { from: to.slice(0, 8) + '01', to }
}
export function periodData(data: StoreState, from: string, to: string) {
  dateOnly(from)
  dateOnly(to)
  requireThat(from <= to, 'A data inicial deve ser anterior ou igual à final.')
  const inPeriod = (date: string) => {
    const day = dayInZone(date, data.stores[0]?.timezone)
    return day >= from && day <= to
  }
  const sales = data.sales.filter(
    (s) => s.status === 'COMPLETED' && s.completedAt && inPeriod(s.completedAt),
  )
  const expenses = data.expenses.filter((e) => e.date >= from && e.date <= to)
  const revenue = sales.reduce((sum, s) => sum + s.total, 0)
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
  return { sales, expenses, revenue, expenseTotal, balance: revenue - expenseTotal, inPeriod }
}
export function financeView(data: StoreState, from: string, to: string) {
  try {
    return { error: '', report: periodData(data, from, to) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Período inválido.', report: null }
  }
}
export function cashExpected(data: StoreState, session: CashSession) {
  return (
    session.openingAmount +
    data.cash_entries
      .filter((e) => e.sessionId === session.id && e.paymentMethod === 'CASH')
      .reduce((sum, e) => sum + e.amount, 0)
  )
}
export function reportView(data: StoreState, from: string, to: string) {
  try {
    const period = periodData(data, from, to)
    const ids = new Set(period.sales.map((s) => s.id))
    const items = active(data.sale_items).filter((i) => ids.has(i.saleId))
    const cost = items.reduce((sum, i) => sum + Math.round(i.unitCost * i.quantity), 0)
    const byProduct = new Map<
      string,
      { id: string; name: string; quantity: number; total: number; unit: string }
    >()
    for (const item of items) {
      const row = byProduct.get(item.productId) ?? {
        id: item.productId,
        name: item.productNameSnapshot,
        quantity: 0,
        total: 0,
        unit: data.products.find((p) => p.id === item.productId)?.unit ?? 'un',
      }
      row.quantity = Math.round((row.quantity + item.quantity) * 1000) / 1000
      row.total += item.subtotal
      byProduct.set(item.productId, row)
    }
    const byDay = new Map<string, number>()
    const byPayment = new Map<string, number>()
    for (const sale of period.sales) {
      const day = dayInZone(sale.completedAt!, data.stores[0]?.timezone)
      byDay.set(day, (byDay.get(day) ?? 0) + sale.total)
      byPayment.set(sale.paymentMethod, (byPayment.get(sale.paymentMethod) ?? 0) + sale.total)
    }
    const cutoff = new Date(`${to}T12:00:00Z`)
    cutoff.setUTCDate(cutoff.getUTCDate() - 30)
    const cutoffDay = cutoff.toISOString().slice(0, 10)
    const recentlySold = new Set(
      data.inventory_movements
        .filter(
          (m) => m.type === 'SALE' && dayInZone(m.createdAt, data.stores[0]?.timezone) >= cutoffDay,
        )
        .map((m) => m.productId),
    )
    const products = active(data.products)
    const movements = data.inventory_movements.filter((m) => period.inPeriod(m.createdAt))
    return {
      error: '',
      report: {
        ...period,
        cost,
        margin: period.revenue - cost,
        bestSellers: [...byProduct.values()].sort((a, b) => b.total - a.total),
        byDay: [...byDay].sort(([a], [b]) => a.localeCompare(b)),
        byPayment: [...byPayment],
        lowStock: products.filter((p) => p.quantity > 0 && p.quantity <= p.minimumStock),
        zeroStock: products.filter((p) => p.quantity === 0),
        idle: products.filter(
          (p) =>
            p.quantity > 0 &&
            dayInZone(p.createdAt, data.stores[0]?.timezone) <= cutoffDay &&
            !recentlySold.has(p.id),
        ),
        movements,
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Período inválido.', report: null }
  }
}
