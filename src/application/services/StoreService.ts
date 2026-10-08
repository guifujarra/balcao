import { emitStoreChange } from './storeEvents'
import {
  active,
  tables,
  type Entity,
  type Product,
  type StoreState,
  type InventoryMovement,
  type MovementType,
  type PaymentMethod,
  type Sale,
  type Contact,
} from '../../domain/model'
import {
  addQuantity,
  comboCode,
  readAppCode,
  dateOnly,
  dayInZone,
  lineTotal,
  money,
  productQuantity,
  quantity,
  requireThat,
  text,
} from '../../domain/rules'
import type { Runtime, StoreRepository } from '../repositories/StoreRepository'

export type ProductInput = Pick<
  Product,
  | 'name'
  | 'barcode'
  | 'sku'
  | 'categoryId'
  | 'salePrice'
  | 'costPrice'
  | 'minimumStock'
  | 'unit'
  | 'expirationDate'
>
export type ContactInput = Pick<Contact, 'name' | 'document' | 'phone' | 'email' | 'notes'>
export class StoreService {
  private repository: StoreRepository
  private runtime: Runtime
  constructor(repository: StoreRepository, runtime: Runtime) {
    this.repository = repository
    this.runtime = runtime
  }
  read() {
    return this.repository.read()
  }
  newRequestId() {
    return this.runtime.id()
  }
  private entity(storeId: string): Entity {
    const now = this.runtime.now()
    return {
      id: this.runtime.id(),
      storeId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      syncStatus: 'PENDING',
    }
  }
  private mutate<T>(operation: (state: StoreState) => T) {
    return this.repository
      .transaction((state) => {
        const transactionId = this.runtime.id()
        const before = new Map<string, string>()
        for (const table of tables)
          for (const row of state[table]) before.set(`${table}/${row.id}`, JSON.stringify(row))
        const result = operation(state)
        for (const table of tables) {
          if (table === 'sync_outbox') continue
          for (const row of state[table]) {
            const previous = before.get(`${table}/${row.id}`)
            if (previous === JSON.stringify(row)) continue
            if (previous) row.version += 1
            row.updatedAt = this.runtime.now()
            row.syncStatus = 'PENDING'
            state.sync_outbox.push({
              ...this.entity(row.storeId),
              transactionId,
              entityType: table,
              entityId: row.id,
              operation: row.deletedAt ? 'DELETE' : 'UPSERT',
              payload: JSON.stringify(row),
              attempts: 0,
              status: 'PENDING',
              lastError: '',
            })
          }
        }
        return result
      })
      .then((result) => {
        emitStoreChange()
        return result
      })
  }
  initialize() {
    return this.mutate((state) => {
      if (!state.stores.length) {
        const entity = this.entity('')
        entity.storeId = entity.id
        state.stores.push({
          ...entity,
          name: 'Minha loja',
          currency: 'BRL',
          timezone: 'America/Sao_Paulo',
        })
      }
      return state.stores[0]!
    })
  }
  updateStore(name: string) {
    return this.mutate((s) => {
      s.stores[0]!.name = text(name, 'Nome da loja')
      return s.stores[0]!
    })
  }
  private storeId(s: StoreState) {
    requireThat(s.stores[0], 'Loja não inicializada.')
    return s.stores[0].id
  }
  private product(s: StoreState, id: string) {
    const p = active(s.products).find((p) => p.id === id)
    requireThat(p, 'Produto não encontrado ou arquivado.')
    return p
  }
  saveCategory(name: string) {
    return this.mutate((s) => {
      const normalized = text(name, 'Categoria', 60)
      const existing = active(s.categories).find(
        (c) => c.name.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
      )
      if (existing) return existing
      const category = { ...this.entity(this.storeId(s)), name: normalized }
      s.categories.push(category)
      return category
    })
  }
  saveProduct(input: ProductInput, id?: string, initialQuantity = 0) {
    return this.mutate((s) => {
      const previous = id ? this.product(s, id) : undefined
      const name = text(input.name, 'Nome')
      const barcode = input.barcode.trim()
      const sku = input.sku.trim()
      requireThat(barcode.length <= 100 && sku.length <= 60, 'Código de barras ou SKU muito longo.')
      requireThat(
        !active(s.products).some(
          (p) =>
            p.id !== id &&
            ((barcode && p.barcode === barcode) ||
              (sku && p.sku.toLocaleLowerCase() === sku.toLocaleLowerCase())),
        ),
        'Código de barras ou SKU já cadastrado.',
      )
      requireThat(['un', 'kg', 'l', 'm'].includes(input.unit), 'Unidade inválida.')
      requireThat(
        !previous || previous.unit === input.unit || previous.quantity === 0,
        'Zere o saldo antes de alterar a unidade.',
      )
      requireThat(
        !input.categoryId || active(s.categories).some((c) => c.id === input.categoryId),
        'Categoria não encontrada.',
      )
      if (input.expirationDate) dateOnly(input.expirationDate)
      const product: Product = {
        ...(previous ?? this.entity(this.storeId(s))),
        ...input,
        name,
        barcode,
        sku,
        salePrice: money(input.salePrice),
        costPrice: money(input.costPrice),
        minimumStock: quantity(input.minimumStock, true),
        quantity: previous?.quantity ?? 0,
      }
      productQuantity(product, product.minimumStock, true)
      if (previous) Object.assign(previous, product)
      else s.products.push(product)
      if (!previous) productQuantity(product, initialQuantity, true)
      if (!previous && initialQuantity)
        this.move(s, product.id, 'IN', initialQuantity, 'Saldo inicial')
      return product
    })
  }
  archiveProduct(id: string) {
    return this.mutate((s) => {
      const p = this.product(s, id)
      requireThat(p.quantity === 0, 'O produto precisa estar sem estoque para ser arquivado.')
      requireThat(
        !active(s.combo_items).some(
          (i) => i.productId === id && active(s.combos).some((c) => c.active && c.id === i.comboId),
        ),
        'Remova o produto dos combos ativos primeiro.',
      )
      requireThat(
        !s.sale_items.some(
          (i) =>
            i.productId === id &&
            s.sales.some((sale) => sale.id === i.saleId && sale.status === 'DRAFT'),
        ),
        'Remova o produto da venda em aberto primeiro.',
      )
      p.deletedAt = this.runtime.now()
    })
  }
  private move(
    s: StoreState,
    productId: string,
    type: MovementType,
    delta: number,
    reason: string,
    referenceId = '',
    referenceType = '',
  ) {
    const product = this.product(s, productId)
    productQuantity(product, Math.abs(delta))
    const currentQuantity = addQuantity(product.quantity, delta)
    requireThat(
      currentQuantity >= 0,
      `Estoque insuficiente: ${product.name}. Disponível: ${product.quantity} ${product.unit}.`,
    )
    productQuantity(product, currentQuantity, true)
    const movement: InventoryMovement = {
      ...this.entity(product.storeId),
      productId,
      type,
      quantityDelta: delta,
      previousQuantity: product.quantity,
      currentQuantity,
      reason,
      referenceId,
      referenceType,
    }
    product.quantity = currentQuantity
    s.inventory_movements.push(movement)
    return movement
  }
  registerMovement(
    productId: string,
    type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN',
    value: number,
    reason: string,
  ) {
    return this.mutate((s) => {
      requireThat(
        ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'].includes(type),
        'Tipo de movimento inválido.',
      )
      const p = this.product(s, productId)
      productQuantity(p, value, type === 'ADJUSTMENT')
      const delta =
        type === 'ADJUSTMENT' ? addQuantity(value, -p.quantity) : type === 'OUT' ? -value : value
      requireThat(delta !== 0, 'O saldo informado já é o saldo atual.')
      return this.move(s, productId, type, delta, text(reason, 'Motivo'))
    })
  }
  saveCombo(
    name: string,
    description: string,
    salePrice: number,
    items: { productId: string; quantity: number }[],
    id?: string,
  ) {
    return this.mutate((s) => {
      requireThat(
        items.length > 0 && new Set(items.map((i) => i.productId)).size === items.length,
        'Adicione produtos diferentes ao combo.',
      )
      for (const item of items) productQuantity(this.product(s, item.productId), item.quantity)
      const existing = id ? active(s.combos).find((c) => c.id === id) : undefined
      requireThat(!id || existing, 'Combo não encontrado.')
      const combo = {
        ...(existing ?? this.entity(this.storeId(s))),
        name: text(name, 'Nome do combo'),
        description: description.trim().slice(0, 1000),
        salePrice: money(salePrice),
        active: true,
        qrPayload: '',
      }
      combo.qrPayload = comboCode(combo.id)
      if (existing) {
        Object.assign(existing, combo)
        for (const item of active(s.combo_items).filter((i) => i.comboId === id))
          item.deletedAt = this.runtime.now()
      } else s.combos.push(combo)
      for (const item of items)
        s.combo_items.push({ ...this.entity(combo.storeId), comboId: combo.id, ...item })
      return combo
    })
  }
  archiveCombo(id: string) {
    return this.mutate((s) => {
      const c = active(s.combos).find((c) => c.id === id)
      requireThat(c, 'Combo não encontrado.')
      c.active = false
      c.deletedAt = this.runtime.now()
    })
  }
  applyCombo(id: string, count: number, direction: 'IN' | 'OUT', reason: string) {
    return this.mutate((s) => {
      quantity(count)
      requireThat(Number.isInteger(count), 'Informe uma quantidade inteira de combos.')
      requireThat(direction === 'IN' || direction === 'OUT', 'Direção inválida.')
      const c = active(s.combos).find((c) => c.id === id && c.active)
      requireThat(c, 'Combo não encontrado.')
      const items = active(s.combo_items).filter((i) => i.comboId === id)
      requireThat(items.length, 'Combo sem produtos.')
      const referenceId = this.runtime.id()
      for (const item of items)
        this.move(
          s,
          item.productId,
          'COMBO',
          (Math.round(item.quantity * count * 1000) / 1000) * (direction === 'OUT' ? -1 : 1),
          text(reason, 'Motivo'),
          referenceId,
          `combo:${c.id}`,
        )
    })
  }
  private currentSale(s: StoreState) {
    const existing = s.sales.find((sale) => sale.status === 'DRAFT')
    if (existing) return existing
    const sale: Sale = {
      ...this.entity(this.storeId(s)),
      subtotal: 0,
      discount: 0,
      total: 0,
      paymentMethod: 'CASH',
      status: 'DRAFT',
      customerId: '',
    }
    s.sales.push(sale)
    return sale
  }
  startSale() {
    return this.mutate((s) => this.currentSale(s))
  }
  private draft(s: StoreState, id: string) {
    const sale = s.sales.find((sale) => sale.id === id)
    requireThat(sale?.status === 'DRAFT', 'A venda não está mais em aberto.')
    return sale
  }
  private saleTotal(s: StoreState, sale: Sale) {
    sale.subtotal = money(
      active(s.sale_items)
        .filter((i) => i.saleId === sale.id)
        .reduce((sum, i) => sum + i.subtotal, 0),
    )
    sale.discount = Math.min(sale.discount, sale.subtotal)
    sale.total = sale.subtotal - sale.discount
  }
  private updateSaleItem(
    s: StoreState,
    sale: Sale,
    product: Product,
    value: number,
    append: boolean,
  ) {
    const item = active(s.sale_items).find(
      (i) => i.saleId === sale.id && i.productId === product.id,
    )
    const count = append ? addQuantity(item?.quantity ?? 0, value) : value
    productQuantity(product, count, true)
    if (count === 0) {
      if (item) item.deletedAt = this.runtime.now()
    } else {
      const next = {
        ...(item ?? this.entity(sale.storeId)),
        saleId: sale.id,
        productId: product.id,
        productNameSnapshot: item?.productNameSnapshot ?? product.name,
        unitPrice: item?.unitPrice ?? product.salePrice,
        unitCost: item?.unitCost ?? product.costPrice,
        quantity: count,
        subtotal: lineTotal(item?.unitPrice ?? product.salePrice, count),
      }
      if (item) Object.assign(item, next)
      else s.sale_items.push(next)
    }
    this.saleTotal(s, sale)
    return sale
  }
  setSaleItem(saleId: string, productId: string, value: number, append = false) {
    return this.mutate((s) =>
      this.updateSaleItem(s, this.draft(s, saleId), this.product(s, productId), value, append),
    )
  }
  private productForCode(s: StoreState, value: string) {
    const clean = value.trim()
    const appCode = readAppCode(clean)
    requireThat(
      appCode?.kind !== 'combo',
      'Este QR é de um combo. Na venda, leia o código de um produto.',
    )
    return (
      active(s.products).find((p) =>
        appCode ? p.id === appCode.id : Boolean(clean) && (p.barcode === clean || p.sku === clean),
      ) ?? null
    )
  }
  addScannedProduct(code: string) {
    return this.mutate((s) => {
      const product = this.productForCode(s, code)
      requireThat(product, 'Produto não encontrado nesta loja.')
      const sale = this.currentSale(s)
      this.updateSaleItem(s, sale, product, 1, true)
      return { product, sale }
    })
  }
  completeSale(id: string, paymentMethod: PaymentMethod, discount: number, customerId = '') {
    return this.mutate((s) => {
      const existing = s.sales.find((sale) => sale.id === id)
      if (existing?.status === 'COMPLETED') return existing
      const sale = this.draft(s, id)
      requireThat(
        ['PIX', 'CASH', 'CARD', 'OTHER'].includes(paymentMethod),
        'Forma de pagamento inválida.',
      )
      requireThat(
        !customerId || active(s.customers).some((c) => c.id === customerId),
        'Cliente não encontrado.',
      )
      const items = active(s.sale_items).filter((i) => i.saleId === id)
      requireThat(items.length > 0, 'Adicione pelo menos um produto.')
      this.saleTotal(s, sale)
      money(discount)
      requireThat(discount <= sale.subtotal, 'Desconto maior que o subtotal.')
      for (const item of items)
        this.move(s, item.productId, 'SALE', -item.quantity, 'Venda finalizada', id, 'sale')
      sale.discount = discount
      sale.total = sale.subtotal - discount
      sale.paymentMethod = paymentMethod
      sale.customerId = customerId
      sale.status = 'COMPLETED'
      sale.completedAt = this.runtime.now()
      this.cashEntry(s, sale.total, 'Venda', id, paymentMethod)
      return sale
    })
  }
  cancelSale(id: string) {
    return this.mutate((s) => {
      const sale = this.draft(s, id)
      sale.status = 'CANCELLED'
      return sale
    })
  }
  saveContact(kind: 'customers' | 'suppliers', input: ContactInput, id?: string) {
    return this.mutate((s) => {
      const existing = id ? active(s[kind]).find((c) => c.id === id) : undefined
      requireThat(!id || existing, 'Cadastro não encontrado.')
      requireThat(
        !input.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email),
        'E-mail inválido.',
      )
      const contact = {
        ...(existing ?? this.entity(this.storeId(s))),
        ...input,
        name: text(input.name, 'Nome'),
        notes: input.notes.trim().slice(0, 2000),
      }
      if (existing) Object.assign(existing, contact)
      else s[kind].push(contact)
      return contact
    })
  }
  archiveContact(kind: 'customers' | 'suppliers', id: string) {
    return this.mutate((s) => {
      const c = active(s[kind]).find((c) => c.id === id)
      requireThat(c, 'Cadastro não encontrado.')
      c.deletedAt = this.runtime.now()
    })
  }
  recordPurchase(
    supplierId: string,
    items: { productId: string; quantity: number; unitCost: number }[],
    requestId: string,
  ) {
    return this.mutate((s) => {
      const existing = s.purchases.find((p) => p.id === requestId)
      if (existing) return existing
      requireThat(
        !supplierId || active(s.suppliers).some((c) => c.id === supplierId),
        'Fornecedor não encontrado.',
      )
      requireThat(
        items.length && new Set(items.map((i) => i.productId)).size === items.length,
        'Adicione produtos diferentes à compra.',
      )
      const purchase = {
        ...this.entity(this.storeId(s)),
        id: requestId,
        supplierId,
        total: 0,
        status: 'COMPLETED' as const,
        completedAt: this.runtime.now(),
      }
      for (const item of items) {
        const p = this.product(s, item.productId)
        productQuantity(p, item.quantity)
        money(item.unitCost)
        const subtotal = lineTotal(item.unitCost, item.quantity)
        s.purchase_items.push({
          ...this.entity(p.storeId),
          purchaseId: purchase.id,
          ...item,
          subtotal,
        })
        purchase.total = money(purchase.total + subtotal)
        p.costPrice = item.unitCost
        this.move(
          s,
          p.id,
          'PURCHASE',
          item.quantity,
          'Recebimento de compra',
          purchase.id,
          'purchase',
        )
      }
      s.purchases.push(purchase)
      return purchase
    })
  }
  private cashEntry(
    s: StoreState,
    amount: number,
    description: string,
    referenceId: string,
    paymentMethod: PaymentMethod,
  ) {
    const session = s.cash_sessions.find((c) => !c.closedAt)
    s.cash_entries.push({
      ...this.entity(this.storeId(s)),
      sessionId: session?.id ?? '',
      amount,
      description,
      referenceId,
      paymentMethod,
    })
  }
  recordExpense(description: string, amount: number, date: string, paymentMethod: PaymentMethod) {
    return this.mutate((s) => {
      money(amount)
      requireThat(amount > 0, 'Informe um valor maior que zero.')
      dateOnly(date)
      requireThat(
        ['PIX', 'CASH', 'CARD', 'OTHER'].includes(paymentMethod),
        'Forma de pagamento inválida.',
      )
      const expense = {
        ...this.entity(this.storeId(s)),
        description: text(description, 'Descrição'),
        amount,
        date,
        paymentMethod,
      }
      s.expenses.push(expense)
      this.cashEntry(s, -amount, expense.description, expense.id, paymentMethod)
      return expense
    })
  }
  openCash(openingAmount: number) {
    return this.mutate((s) => {
      requireThat(!s.cash_sessions.some((c) => !c.closedAt), 'Já existe um caixa aberto.')
      const session = { ...this.entity(this.storeId(s)), openingAmount: money(openingAmount) }
      s.cash_sessions.push(session)
      return session
    })
  }
  closeCash(closingAmount: number) {
    return this.mutate((s) => {
      const session = s.cash_sessions.find((c) => !c.closedAt)
      requireThat(session, 'Não existe caixa aberto.')
      session.closingAmount = money(closingAmount)
      session.expectedAmount =
        session.openingAmount +
        s.cash_entries
          .filter((e) => e.sessionId === session.id && e.paymentMethod === 'CASH')
          .reduce((sum, e) => sum + e.amount, 0)
      session.closedAt = this.runtime.now()
      return session
    })
  }
  async findCode(code: string) {
    const s = await this.read()
    return this.productForCode(s, code)
  }
  today() {
    return dayInZone(this.runtime.now())
  }
}
