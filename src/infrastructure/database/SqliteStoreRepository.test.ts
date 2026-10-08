import 'fake-indexeddb/auto'
import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { beforeAll, expect, it } from 'vitest'
import { WebSqlDriver } from './WebSqlDriver'
import { SqliteStoreRepository } from './SqliteStoreRepository'
import { StoreService, type ProductInput } from '../../application/services/StoreService'
let sql: SqlJsStatic
const runtime = { id: () => crypto.randomUUID(), now: () => new Date().toISOString() }
beforeAll(async () => {
  sql = await initSqlJs()
})
const input: ProductInput = {
  name: 'Arroz',
  barcode: '123',
  sku: 'AR',
  salePrice: 500,
  costPrice: 300,
  minimumStock: 1,
  unit: 'un',
  categoryId: '',
  expirationDate: '',
}
it('aplica migration idempotente e persiste após fechar/reabrir SQLite e IndexedDB', async () => {
  const name = crypto.randomUUID()
  const driver = await WebSqlDriver.open(sql, name)
  const repo = new SqliteStoreRepository(driver)
  await repo.migrate()
  await repo.migrate()
  const service = new StoreService(repo, runtime)
  await service.initialize()
  await service.saveProduct(input, undefined, 10)
  driver.close()
  const reopened = await WebSqlDriver.open(sql, name)
  const r = new SqliteStoreRepository(reopened)
  await r.migrate()
  expect((await r.read()).products[0]).toMatchObject({ name: 'Arroz', quantity: 10 })
  reopened.close()
})
it('reverte transação SQLite e evita perda de atualização entre conexões concorrentes', async () => {
  const name = crypto.randomUUID()
  const a = await WebSqlDriver.open(sql, name)
  const b = await WebSqlDriver.open(sql, name)
  const r1 = new SqliteStoreRepository(a)
  const r2 = new SqliteStoreRepository(b)
  await r1.migrate()
  const s1 = new StoreService(r1, runtime)
  const s2 = new StoreService(r2, runtime)
  await s1.initialize()
  const p = await s1.saveProduct(input, undefined, 10)
  await Promise.all([
    s1.registerMovement(p.id, 'OUT', 2, 'A'),
    s2.registerMovement(p.id, 'OUT', 3, 'B'),
  ])
  expect((await r1.read()).products[0]?.quantity).toBe(5)
  await expect(
    r1.transaction((state) => {
      state.products[0]!.quantity = 999
      throw new Error('Falha simulada')
    }),
  ).rejects.toThrow('Falha simulada')
  expect((await r2.read()).products[0]?.quantity).toBe(5)
  a.close()
  b.close()
})
