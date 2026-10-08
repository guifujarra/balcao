import { z } from 'zod'
import { tables, type StoreState } from '../../domain/model'
import { addQuantity, comboCode, dateOnly, requireThat } from '../../domain/rules'
const id = z.string().uuid()
const timestamp = z.string().datetime()
const amount = z.number().int().min(0).max(10_000_000_000)
const quantity = z
  .number()
  .min(0)
  .max(1_000_000)
  .refine((n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 0.00001)
const base = z.object({
  id,
  storeId: id,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp.optional(),
  version: z.number().int().positive(),
  syncStatus: z.enum(['PENDING', 'SYNCED']),
})
const payment = z.enum(['PIX', 'CASH', 'CARD', 'OTHER'])
const contact = base.extend({
  name: z.string().min(1).max(160),
  document: z.string(),
  phone: z.string(),
  email: z.string(),
  notes: z.string(),
})
const date = z.string().refine((value) => {
  try {
    dateOnly(value)
    return true
  } catch {
    return false
  }
})
const schema = z.object({
  format: z.literal('balcao-backup'),
  version: z.literal(1),
  exportedAt: timestamp,
  state: z.object({
    stores: z
      .array(
        base.extend({ name: z.string().min(1), currency: z.literal('BRL'), timezone: z.string() }),
      )
      .length(1),
    categories: z.array(base.extend({ name: z.string().min(1) })),
    products: z.array(
      base.extend({
        name: z.string().min(1),
        barcode: z.string(),
        sku: z.string(),
        categoryId: z.string(),
        salePrice: amount,
        costPrice: amount,
        quantity,
        minimumStock: quantity,
        unit: z.enum(['un', 'kg', 'l', 'm']),
        expirationDate: z.union([date, z.literal('')]),
      }),
    ),
    inventory_movements: z.array(
      base.extend({
        productId: id,
        type: z.enum(['PURCHASE', 'SALE', 'IN', 'OUT', 'ADJUSTMENT', 'COMBO', 'RETURN']),
        quantityDelta: z.number().finite(),
        previousQuantity: quantity,
        currentQuantity: quantity,
        reason: z.string(),
        referenceType: z.string(),
        referenceId: z.string(),
      }),
    ),
    combos: z.array(
      base.extend({
        name: z.string().min(1),
        description: z.string(),
        qrPayload: z.string(),
        salePrice: amount,
        active: z.boolean(),
      }),
    ),
    combo_items: z.array(
      base.extend({ comboId: id, productId: id, quantity: quantity.refine((n) => n > 0) }),
    ),
    sales: z.array(
      base.extend({
        subtotal: amount,
        discount: amount,
        total: amount,
        paymentMethod: payment,
        status: z.enum(['DRAFT', 'COMPLETED', 'CANCELLED']),
        completedAt: timestamp.optional(),
        customerId: z.string(),
      }),
    ),
    sale_items: z.array(
      base.extend({
        saleId: id,
        productId: id,
        productNameSnapshot: z.string(),
        unitPrice: amount,
        unitCost: amount,
        quantity: quantity.refine((n) => n > 0),
        subtotal: amount,
      }),
    ),
    customers: z.array(contact),
    suppliers: z.array(contact),
    purchases: z.array(
      base.extend({
        supplierId: z.string(),
        total: amount,
        status: z.literal('COMPLETED'),
        completedAt: timestamp,
      }),
    ),
    purchase_items: z.array(
      base.extend({
        purchaseId: id,
        productId: id,
        quantity: quantity.refine((n) => n > 0),
        unitCost: amount,
        subtotal: amount,
      }),
    ),
    cash_sessions: z.array(
      base.extend({
        openingAmount: amount,
        closingAmount: amount.optional(),
        expectedAmount: z.number().int().optional(),
        closedAt: timestamp.optional(),
      }),
    ),
    cash_entries: z.array(
      base.extend({
        sessionId: z.string(),
        amount: z.number().int(),
        description: z.string(),
        referenceId: z.string(),
        paymentMethod: payment,
      }),
    ),
    expenses: z.array(
      base.extend({ description: z.string(), amount, date, paymentMethod: payment }),
    ),
    sync_outbox: z.array(
      base.extend({
        transactionId: id.optional(),
        entityType: z.string(),
        entityId: id,
        operation: z.enum(['UPSERT', 'DELETE']),
        payload: z.string(),
        attempts: z.number().int().nonnegative(),
        status: z.enum(['PENDING', 'PROCESSING', 'SYNCED', 'FAILED']),
        lastError: z.string(),
      }),
    ),
  }),
})
export function parseBackup(contents: string): StoreState {
  let decoded: unknown
  try {
    decoded = JSON.parse(contents)
  } catch {
    throw new Error('O arquivo não é um backup JSON válido.')
  }
  const result = schema.safeParse(decoded)
  requireThat(result.success, 'Backup inválido ou de uma versão incompatível.')
  const state = result.data.state
  const storeId = state.stores[0]!.id
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: state.stores[0]!.timezone })
  } catch {
    throw new Error('Fuso horário inválido no backup.')
  }
  for (const table of tables) {
    const rows = state[table]
    requireThat(
      new Set(rows.map((r) => r.id)).size === rows.length &&
        rows.every((r) => r.storeId === storeId),
      'Identificadores inconsistentes no backup.',
    )
  }
  const productIds = new Set(state.products.map((p) => p.id))
  const saleIds = new Set(state.sales.map((s) => s.id))
  const balances = new Map<string, number>()
  for (const movement of state.inventory_movements) {
    requireThat(
      productIds.has(movement.productId) &&
        (balances.get(movement.productId) ?? 0) === movement.previousQuantity &&
        addQuantity(movement.previousQuantity, movement.quantityDelta) === movement.currentQuantity,
      'Histórico de estoque inconsistente no backup.',
    )
    balances.set(movement.productId, movement.currentQuantity)
  }
  for (const p of state.products)
    requireThat(
      p.quantity === (balances.get(p.id) ?? 0) && (p.unit !== 'un' || Number.isInteger(p.quantity)),
      'Saldo de produto inconsistente no backup.',
    )
  for (const item of state.sale_items)
    requireThat(
      productIds.has(item.productId) &&
        saleIds.has(item.saleId) &&
        item.subtotal === Math.round(item.unitPrice * item.quantity),
      'Item de venda inconsistente no backup.',
    )
  for (const sale of state.sales) {
    const subtotal = state.sale_items
      .filter((i) => i.saleId === sale.id && !i.deletedAt)
      .reduce((sum, i) => sum + i.subtotal, 0)
    requireThat(
      sale.subtotal === subtotal &&
        sale.total === subtotal - sale.discount &&
        (sale.status !== 'COMPLETED' || sale.completedAt),
      'Total de venda inconsistente no backup.',
    )
  }
  for (const item of state.combo_items)
    requireThat(
      productIds.has(item.productId) && state.combos.some((c) => c.id === item.comboId),
      'Composição de combo inconsistente.',
    )
  for (const item of state.purchase_items)
    requireThat(
      productIds.has(item.productId) &&
        state.purchases.some((p) => p.id === item.purchaseId) &&
        item.subtotal === Math.round(item.unitCost * item.quantity),
      'Compra inconsistente no backup.',
    )
  requireThat(
    state.sales.filter((s) => s.status === 'DRAFT').length <= 1 &&
      state.cash_sessions.filter((c) => !c.closedAt).length <= 1,
    'Há mais de um carrinho ou caixa aberto no backup.',
  )
  const ids = (rows: { id: string }[]) => new Set(rows.map((row) => row.id))
  const categoryIds = ids(state.categories),
    customerIds = ids(state.customers),
    supplierIds = ids(state.suppliers),
    sessionIds = ids(state.cash_sessions)
  const optionalReference = (value: string, targets: Set<string>) => !value || targets.has(value)
  for (const product of state.products)
    requireThat(
      optionalReference(product.categoryId, categoryIds),
      'Categoria de produto ausente no backup.',
    )
  for (const sale of state.sales)
    requireThat(
      optionalReference(sale.customerId, customerIds),
      'Cliente de venda ausente no backup.',
    )
  for (const purchase of state.purchases) {
    const items = state.purchase_items.filter(
      (item) => item.purchaseId === purchase.id && !item.deletedAt,
    )
    requireThat(
      optionalReference(purchase.supplierId, supplierIds) &&
        items.length > 0 &&
        purchase.total === items.reduce((total, item) => total + item.subtotal, 0),
      'Total ou fornecedor da compra inconsistente no backup.',
    )
  }
  for (const entry of state.cash_entries)
    requireThat(
      optionalReference(entry.sessionId, sessionIds),
      'Caixa de lançamento ausente no backup.',
    )
  for (const combo of state.combos)
    requireThat(combo.qrPayload === comboCode(combo.id), 'QR de combo inconsistente no backup.')
  return state
}
