import { Capacitor } from '@capacitor/core'
import { SqliteStoreRepository } from './SqliteStoreRepository'
export async function createRepository() {
  const driver = Capacitor.isNativePlatform()
    ? await (await import('./NativeSqlDriver')).NativeSqlDriver.open()
    : await createWebDriver()
  const repository = new SqliteStoreRepository(driver)
  await repository.migrate()
  return repository
}
async function createWebDriver() {
  const [{ default: initSqlJs }, { default: wasmUrl }, { WebSqlDriver }] = await Promise.all([
    import('sql.js'),
    import('sql.js/dist/sql-wasm.wasm?url'),
    import('./WebSqlDriver'),
  ])
  const sql = await initSqlJs({ locateFile: () => wasmUrl })
  return WebSqlDriver.open(sql)
}
