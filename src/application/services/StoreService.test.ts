import { beforeEach, describe, expect, it } from 'vitest'
import { StoreService, type ProductInput } from './StoreService'
import { MemoryStoreRepository } from '../../test/MemoryStoreRepository'
import { comboCode, readComboCode, productCode, readAppCode } from '../../domain/rules'
const input: ProductInput = {
  name: 'Café',
  barcode: '789001',
  sku: 'CAF',
  categoryId: '',
  salePrice: 1299,
  costPrice: 500,
  minimumStock: 2,
  unit: 'un',
  expirationDate: '',
}
let service: StoreService
beforeEach(async () => {
  service = new StoreService(new MemoryStoreRepository(), {
    id: () => crypto.randomUUID(),
    now: () => '2026-09-29T12:00:00Z',
  })
  await service.initialize()
})
describe('domínio e transações', () => {
  it('começa na primeira leitura e acumula códigos de barras e QR na mesma venda', async () => {
    const a = await service.saveProduct(input, undefined, 5)
    const b = await service.saveProduct(
      { ...input, name: 'Doce customizado', barcode: '', sku: '' },
      undefined,
      5,
    )
    const first = await service.addScannedProduct('789001')
    const before = await service.read()
    const saleEvent = before.sync_outbox.find((e) => e.entityType === 'sales')
    const itemEvent = before.sync_outbox.find((e) => e.entityType === 'sale_items')
    expect(saleEvent?.transactionId).toBe(itemEvent?.transactionId)
    await service.addScannedProduct(productCode(b.id))
    await service.addScannedProduct(productCode(a.id))
    const state = await service.read()
    expect(state.sales).toHaveLength(1)
    expect(state.sales[0]?.id).toBe(first.sale.id)
    expect(state.sales[0]?.subtotal).toBe(input.salePrice * 3)
    expect(state.sale_items.map((i) => i.quantity)).toEqual([2, 1])
    expect(state.products[0]?.quantity).toBe(5)
    expect(await service.findCode(productCode(b.id))).toMatchObject({ id: b.id })
  })
  it('rejeita códigos desconhecidos, QR de combo e versões inválidas sem criar venda', async () => {
    const before = await service.read()
    await expect(service.addScannedProduct('9999')).rejects.toThrow('não encontrado')
    await expect(service.addScannedProduct(comboCode(crypto.randomUUID()))).rejects.toThrow('combo')
    await expect(service.addScannedProduct('app:v2:produto:invalid')).rejects.toThrow('inválido')
    expect(await service.read()).toEqual(before)
    expect(() => readAppCode('app:v1:produto:invalid')).toThrow()
  })
  it('preserva o QR após editar o produto e rejeita um produto arquivado', async () => {
    const p = await service.saveProduct({ ...input, barcode: '', sku: '' })
    const code = productCode(p.id)
    await service.saveProduct({ ...input, name: 'Nome atualizado', barcode: '', sku: '' }, p.id)
    expect((await service.findCode(code))?.name).toBe('Nome atualizado')
    await service.archiveProduct(p.id)
    expect(await service.findCode(code)).toBeNull()
    await expect(service.addScannedProduct(code)).rejects.toThrow('não encontrado')
    expect((await service.read()).sales).toHaveLength(0)
  })
  it('valida cadastro, duplicidade, centavos e movimento inicial', async () => {
    const p = await service.saveProduct(input, undefined, 10)
    await expect(service.saveProduct(input)).rejects.toThrow('já cadastrado')
    await expect(
      service.saveProduct({ ...input, barcode: '', sku: '', salePrice: 1.2 }),
    ).rejects.toThrow('monetário')
    expect((await service.read()).inventory_movements[0]).toMatchObject({
      productId: p.id,
      previousQuantity: 0,
      currentQuantity: 10,
    })
  })
  it('impede estoque negativo e preserva estado após falha', async () => {
    const p = await service.saveProduct(input, undefined, 2)
    const before = await service.read()
    await expect(service.registerMovement(p.id, 'OUT', 3, 'Perda')).rejects.toThrow('insuficiente')
    expect(await service.read()).toEqual(before)
    await service.registerMovement(p.id, 'ADJUSTMENT', 0, 'Contagem física')
    expect((await service.read()).products[0]?.quantity).toBe(0)
  })
  it('aplica combo atomicamente e valida QR versionado', async () => {
    const a = await service.saveProduct(input, undefined, 5)
    const b = await service.saveProduct(
      { ...input, name: 'Leite', barcode: '789002', sku: 'LEI' },
      undefined,
      1,
    )
    const c = await service.saveCombo('Café da manhã', '', 1500, [
      { productId: a.id, quantity: 2 },
      { productId: b.id, quantity: 2 },
    ])
    expect(readComboCode(comboCode(c.id))).toBe(c.id)
    expect(() => readComboCode('app:v2:combo:invalid')).toThrow()
    const before = await service.read()
    await expect(service.applyCombo(c.id, 1, 'OUT', 'Entrega')).rejects.toThrow('insuficiente')
    expect(await service.read()).toEqual(before)
  })
  it('finaliza uma única vez, salva snapshots, movimentos e outbox', async () => {
    const p = await service.saveProduct(input, undefined, 10)
    const sale = await service.startSale()
    await service.setSaleItem(sale.id, p.id, 2)
    await service.saveProduct({ ...input, name: 'Café novo', salePrice: 2000 }, p.id)
    const result = await service.completeSale(sale.id, 'PIX', 98)
    expect(result.total).toBe(2500)
    await service.completeSale(sale.id, 'PIX', 98)
    const s = await service.read()
    expect(s.products[0]?.quantity).toBe(8)
    expect(s.sale_items[0]?.productNameSnapshot).toBe('Café')
    expect(s.inventory_movements.filter((m) => m.type === 'SALE')).toHaveLength(1)
    expect(s.sync_outbox.some((e) => e.entityType === 'sales')).toBe(true)
  })
  it('reverte todos os itens da venda se o último falha', async () => {
    const a = await service.saveProduct(input, undefined, 10)
    const b = await service.saveProduct({ ...input, sku: 'B', barcode: 'B' })
    const sale = await service.startSale()
    await service.setSaleItem(sale.id, a.id, 2)
    await service.setSaleItem(sale.id, b.id, 1)
    const before = await service.read()
    await expect(service.completeSale(sale.id, 'CASH', 0)).rejects.toThrow('insuficiente')
    expect(await service.read()).toEqual(before)
  })
  it('cancela rascunho sem movimentar estoque e preserva quantidades fracionárias', async () => {
    const p = await service.saveProduct({ ...input, unit: 'kg' }, undefined, 0.3)
    await service.registerMovement(p.id, 'OUT', 0.1, 'Saída')
    expect((await service.read()).products[0]?.quantity).toBe(0.2)
    const sale = await service.startSale()
    await service.setSaleItem(sale.id, p.id, 0.1)
    await service.cancelSale(sale.id)
    expect((await service.read()).products[0]?.quantity).toBe(0.2)
  })
  it('registra compra idempotente e calcula caixa somente com dinheiro', async () => {
    const p = await service.saveProduct(input)
    const requestId = crypto.randomUUID()
    await service.recordPurchase('', [{ productId: p.id, quantity: 5, unitCost: 600 }], requestId)
    await service.recordPurchase('', [{ productId: p.id, quantity: 5, unitCost: 600 }], requestId)
    expect((await service.read()).products[0]?.quantity).toBe(5)
    await service.openCash(10000)
    await service.recordExpense('Entrega', 1000, '2026-09-29', 'CASH')
    await service.recordExpense('Internet', 2000, '2026-09-29', 'PIX')
    expect((await service.closeCash(9000)).expectedAmount).toBe(9000)
  })
})
