import { expect, it } from 'vitest'
import { MemoryStoreRepository } from '../../test/MemoryStoreRepository'
import { StoreService } from './StoreService'
import { BackupService } from './BackupService'
import { parseBackup } from './backupValidation'

async function fixture() {
  const repo = new MemoryStoreRepository()
  const service = new StoreService(repo, {
    id: () => crypto.randomUUID(),
    now: () => new Date().toISOString(),
  })
  await service.initialize()
  const product = await service.saveProduct(
    {
      name: 'Teste',
      barcode: '',
      sku: '',
      categoryId: '',
      salePrice: 1000,
      costPrice: 200,
      minimumStock: 0,
      unit: 'un',
      expirationDate: '',
    },
    undefined,
    5,
  )
  await service.recordPurchase(
    '',
    [{ productId: product.id, quantity: 2, unitCost: 250 }],
    service.newRequestId(),
  )
  await service.saveCombo('Kit', '', 2000, [{ productId: product.id, quantity: 2 }])
  return { service, repo, backup: await new BackupService(repo).export() }
}

it('recusa totais, referências, datas e QR corrompidos antes de restaurar', async () => {
  const { backup } = await fixture()
  const total = JSON.parse(backup)
  total.state.purchases[0].total++
  expect(() => parseBackup(JSON.stringify(total))).toThrow('compra')
  const reference = JSON.parse(backup)
  reference.state.products[0].categoryId = crypto.randomUUID()
  expect(() => parseBackup(JSON.stringify(reference))).toThrow('Categoria')
  const date = JSON.parse(backup)
  date.state.products[0].expirationDate = '2026-02-31'
  expect(() => parseBackup(JSON.stringify(date))).toThrow('inválido')
  const qr = JSON.parse(backup)
  qr.state.combos[0].qrPayload = 'app:v1:combo:' + crypto.randomUUID()
  expect(() => parseBackup(JSON.stringify(qr))).toThrow('QR')
})

it('agrupa os eventos de uma venda na mesma transação e preserva a idempotência', async () => {
  const { service } = await fixture()
  const product = (await service.read()).products[0]!
  const sale = await service.startSale()
  await service.setSaleItem(sale.id, product.id, 1)
  const before = (await service.read()).sync_outbox.length
  await service.completeSale(sale.id, 'CASH', 0)
  const events = (await service.read()).sync_outbox.slice(before)
  expect(events.length).toBeGreaterThan(2)
  expect(events.every((event) => Boolean(event.transactionId))).toBe(true)
  expect(new Set(events.map((event) => event.transactionId)).size).toBe(1)
  await service.completeSale(sale.id, 'CASH', 0)
  expect((await service.read()).sync_outbox).toHaveLength(before + events.length)
})
