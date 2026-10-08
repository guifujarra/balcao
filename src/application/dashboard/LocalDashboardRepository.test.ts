import { expect, it } from 'vitest'
import { StoreService } from '../services/StoreService'
import { MemoryStoreRepository } from '../../test/MemoryStoreRepository'
import { LocalDashboardRepository } from './LocalDashboardRepository'
it('consulta indicadores reais após venda e inclui vencidos no alerta de validade', async () => {
  const now = () => '2026-09-29T15:00:00Z'
  const service = new StoreService(new MemoryStoreRepository(), {
    id: () => crypto.randomUUID(),
    now,
  })
  await service.initialize()
  const product = await service.saveProduct(
    {
      name: 'Leite',
      barcode: '',
      sku: '',
      categoryId: '',
      salePrice: 550,
      costPrice: 300,
      minimumStock: 3,
      unit: 'un',
      expirationDate: '2026-09-28',
    },
    undefined,
    5,
  )
  const sale = await service.startSale()
  await service.setSaleItem(sale.id, product.id, 2)
  await service.completeSale(sale.id, 'CASH', 100)
  const repo = new LocalDashboardRepository(service, now)
  expect(await repo.getSummary()).toMatchObject({
    salesTodayCents: 1000,
    completedSalesCount: 1,
    productCount: 1,
    lowStockCount: 1,
    expiringSoonCount: 1,
  })
  const abort = new AbortController()
  abort.abort()
  await expect(repo.getSummary(abort.signal)).rejects.toThrow()
})
