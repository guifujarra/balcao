export interface Entity {
  id: string
  storeId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  version: number
  syncStatus: 'PENDING' | 'SYNCED'
}
export interface Store extends Entity {
  name: string
  currency: string
  timezone: string
}
export interface Category extends Entity {
  name: string
}
export interface Product extends Entity {
  name: string
  barcode: string
  sku: string
  categoryId: string
  salePrice: number
  costPrice: number
  quantity: number
  minimumStock: number
  unit: 'un' | 'kg' | 'l' | 'm'
  expirationDate: string
}
export type MovementType = 'PURCHASE' | 'SALE' | 'IN' | 'OUT' | 'ADJUSTMENT' | 'COMBO' | 'RETURN'
export interface InventoryMovement extends Entity {
  productId: string
  type: MovementType
  quantityDelta: number
  previousQuantity: number
  currentQuantity: number
  reason: string
  referenceType: string
  referenceId: string
}
export interface Combo extends Entity {
  name: string
  description: string
  qrPayload: string
  salePrice: number
  active: boolean
}
export interface ComboItem extends Entity {
  comboId: string
  productId: string
  quantity: number
}
export type PaymentMethod = 'PIX' | 'CASH' | 'CARD' | 'OTHER'
export interface Sale extends Entity {
  subtotal: number
  discount: number
  total: number
  paymentMethod: PaymentMethod
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED'
  completedAt?: string
  customerId: string
}
export interface SaleItem extends Entity {
  saleId: string
  productId: string
  productNameSnapshot: string
  unitPrice: number
  unitCost: number
  quantity: number
  subtotal: number
}
export interface Contact extends Entity {
  name: string
  document: string
  phone: string
  email: string
  notes: string
}
export interface Purchase extends Entity {
  supplierId: string
  total: number
  status: 'COMPLETED'
  completedAt: string
}
export interface PurchaseItem extends Entity {
  purchaseId: string
  productId: string
  quantity: number
  unitCost: number
  subtotal: number
}
export interface CashSession extends Entity {
  openingAmount: number
  closingAmount?: number
  expectedAmount?: number
  closedAt?: string
}
export interface CashEntry extends Entity {
  sessionId: string
  amount: number
  description: string
  referenceId: string
  paymentMethod: PaymentMethod
}
export interface Expense extends Entity {
  description: string
  amount: number
  date: string
  paymentMethod: PaymentMethod
}
export interface OutboxEvent extends Entity {
  transactionId?: string
  entityType: string
  entityId: string
  operation: 'UPSERT' | 'DELETE'
  payload: string
  attempts: number
  status: 'PENDING' | 'PROCESSING' | 'SYNCED' | 'FAILED'
  lastError: string
}
export interface StoreState {
  stores: Store[]
  categories: Category[]
  products: Product[]
  inventory_movements: InventoryMovement[]
  combos: Combo[]
  combo_items: ComboItem[]
  sales: Sale[]
  sale_items: SaleItem[]
  customers: Contact[]
  suppliers: Contact[]
  purchases: Purchase[]
  purchase_items: PurchaseItem[]
  cash_sessions: CashSession[]
  cash_entries: CashEntry[]
  expenses: Expense[]
  sync_outbox: OutboxEvent[]
}
export const tables = [
  'stores',
  'categories',
  'products',
  'inventory_movements',
  'combos',
  'combo_items',
  'sales',
  'sale_items',
  'customers',
  'suppliers',
  'purchases',
  'purchase_items',
  'cash_sessions',
  'cash_entries',
  'expenses',
  'sync_outbox',
] as const
export function emptyState(): StoreState {
  return {
    stores: [],
    categories: [],
    products: [],
    inventory_movements: [],
    combos: [],
    combo_items: [],
    sales: [],
    sale_items: [],
    customers: [],
    suppliers: [],
    purchases: [],
    purchase_items: [],
    cash_sessions: [],
    cash_entries: [],
    expenses: [],
    sync_outbox: [],
  }
}
export const active = <T extends Entity>(rows: T[]) => rows.filter((row) => !row.deletedAt)
