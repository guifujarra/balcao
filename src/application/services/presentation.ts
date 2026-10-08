import { active, type Product, type StoreState } from '../../domain/model'
import { dayInZone } from '../../domain/rules'
export function cartSummary(data: StoreState | null) {
  const sale = data?.sales.find((s) => !s.deletedAt && s.status === 'DRAFT') ?? null
  const items =
    sale && data ? active(data.sale_items).filter((item) => item.saleId === sale.id) : []
  return { sale, items, count: items.length }
}
export const brl = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
export const units = (value: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value)
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value))
export function saleQuote(sale: { subtotal: number }, discount: string) {
  try {
    const amount = cents(discount)
    return amount <= sale.subtotal ? brl(sale.subtotal - amount) : 'Revise o desconto'
  } catch {
    return 'Revise o desconto'
  }
}
export const paymentLabels = { CASH: 'Dinheiro', PIX: 'Pix', CARD: 'Cartão', OTHER: 'Outro' }
export const movementLabels = {
  IN: 'Entrada',
  OUT: 'Saída',
  ADJUSTMENT: 'Ajuste',
  RETURN: 'Devolução',
  SALE: 'Venda',
  PURCHASE: 'Compra',
  COMBO: 'Combo',
}
export function decimal(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) throw new Error('Informe um número válido.')
  return Number(normalized)
}
export function cents(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw new Error('Informe um valor com até duas casas decimais.')
  return Math.round(Number(normalized) * 100)
}
export function productView(p: Product, s: StoreState) {
  return {
    id: p.id,
    name: p.name,
    category: s.categories.find((c) => c.id === p.categoryId)?.name ?? 'Sem categoria',
    sku: p.sku || p.barcode || 'Sem código',
    price: brl(p.salePrice),
    stock: `${units(p.quantity)} ${p.unit}`,
    status:
      p.quantity === 0
        ? 'Sem estoque'
        : p.quantity <= p.minimumStock
          ? 'Estoque baixo'
          : 'Em estoque',
    tone:
      p.quantity === 0
        ? ('danger' as const)
        : p.quantity <= p.minimumStock
          ? ('warning' as const)
          : ('success' as const),
  }
}
export function filterProducts(s: StoreState, query = '', filter = '', category = '') {
  const today = dayInZone(new Date().toISOString(), s.stores[0]?.timezone)
  const until = new Date(`${today}T12:00:00Z`)
  until.setUTCDate(until.getUTCDate() + 7)
  const term = query.trim().toLocaleLowerCase()
  return active(s.products).filter(
    (p) =>
      (!term || [p.name, p.sku, p.barcode].some((v) => v.toLocaleLowerCase().includes(term))) &&
      (!category || p.categoryId === category) &&
      (filter === 'baixo'
        ? p.quantity > 0 && p.quantity <= p.minimumStock
        : filter === 'zerado'
          ? p.quantity === 0
          : filter === 'validade'
            ? p.quantity > 0 &&
              Boolean(p.expirationDate) &&
              p.expirationDate <= until.toISOString().slice(0, 10)
            : true),
  )
}
