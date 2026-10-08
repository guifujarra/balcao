import { expect, it } from 'vitest'
import { BackupService } from './BackupService'
import { parseBackup } from './backupValidation'
import { MemoryStoreRepository } from '../../test/MemoryStoreRepository'
import { StoreService } from './StoreService'
it('valida backup completo e restaura identificadores e histórico em loja vazia', async () => {
  const repo = new MemoryStoreRepository()
  const service = new StoreService(repo, {
    id: () => crypto.randomUUID(),
    now: () => new Date().toISOString(),
  })
  await service.initialize()
  await service.saveProduct(
    {
      name: 'Produto',
      barcode: '',
      sku: '',
      categoryId: '',
      salePrice: 500,
      costPrice: 200,
      minimumStock: 1,
      unit: 'un',
      expirationDate: '',
    },
    undefined,
    3,
  )
  const backup = await new BackupService(repo).export()
  const restored = new MemoryStoreRepository()
  await new BackupService(restored).restore(backup)
  expect(await restored.read()).toEqual(await repo.read())
  await expect(new BackupService(repo).restore(backup)).rejects.toThrow('vazia')
  const corrupt = JSON.parse(backup)
  corrupt.state.products[0].quantity = 99
  expect(() => parseBackup(JSON.stringify(corrupt))).toThrow('Saldo')
  expect(() => parseBackup('{"version":999}')).toThrow('inválido')
})
