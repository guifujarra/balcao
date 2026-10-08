import { expect, it } from 'vitest'
import { StoreService } from './StoreService'
import { MemoryStoreRepository } from '../../test/MemoryStoreRepository'
import { reportView, financeView } from './reports'
it('usa datas inclusivas no fuso da loja e margem com custo histórico', async () => {
  const service = new StoreService(new MemoryStoreRepository(), {
    id: () => crypto.randomUUID(),
    now: () => '2026-09-30T01:00:00Z',
  })
  await service.initialize()
  const input = {
    name: 'Arroz',
    barcode: '',
    sku: '',
    categoryId: '',
    salePrice: 1000,
    costPrice: 400,
    minimumStock: 1,
    unit: 'un' as const,
    expirationDate: '',
  }
  const p = await service.saveProduct(input, undefined, 5)
  const sale = await service.startSale()
  await service.setSaleItem(sale.id, p.id, 2)
  await service.completeSale(sale.id, 'CARD', 100)
  await service.saveProduct({ ...input, costPrice: 999 }, p.id)
  const data = await service.read()
  const report = reportView(data, '2026-09-29', '2026-09-29').report
  expect(report).toMatchObject({ revenue: 1900, cost: 800, margin: 1100 })
  expect(report?.byPayment).toEqual([['CARD', 1900]])
  expect(reportView(data, '2026-09-30', '2026-09-30').report?.sales).toHaveLength(0)
  expect(financeView(data, '2026-10-01', '2026-09-01').error).toBeTruthy()
})
