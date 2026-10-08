import { emptyState, tables, type Entity, type StoreState } from '../../domain/model'
import type { StoreRepository } from '../../application/repositories/StoreRepository'
import type { SqlDriver, SqlSession } from './SqlDriver'
export class SqliteStoreRepository implements StoreRepository {
  private driver: SqlDriver
  constructor(driver: SqlDriver) {
    this.driver = driver
  }
  async migrate() {
    await this.driver.access(true, async (sql) => {
      await sql.execute(
        'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);',
      )
      const applied = await sql.query(
        'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;',
      )
      const version = Number(applied[0]?.version ?? 0)
      if (version > 1) throw new Error('Este banco exige uma versão mais recente do Balcão.')
      if (version === 1) return
      for (const table of tables) {
        await sql.execute(
          `CREATE TABLE ${table} (id TEXT PRIMARY KEY NOT NULL, store_id TEXT NOT NULL, payload TEXT NOT NULL CHECK(json_valid(payload)));`,
        )
        await sql.execute(`CREATE INDEX idx_${table}_store ON ${table}(store_id);`)
      }
      await sql.execute(
        "CREATE UNIQUE INDEX idx_product_barcode ON products(json_extract(payload, '$.barcode')) WHERE json_extract(payload, '$.barcode') <> '' AND json_extract(payload, '$.deletedAt') IS NULL;",
      )
      await sql.execute(
        "CREATE UNIQUE INDEX idx_product_sku ON products(lower(json_extract(payload, '$.sku'))) WHERE json_extract(payload, '$.sku') <> '' AND json_extract(payload, '$.deletedAt') IS NULL;",
      )
      await sql.execute(
        'CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE sync_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);',
      )
      await sql.execute('INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)', [
        1,
        new Date().toISOString(),
      ])
    })
  }
  private async load(sql: SqlSession) {
    const state = emptyState()
    for (const table of tables) {
      const rows = await sql.query(`SELECT payload FROM ${table} ORDER BY rowid;`)
      for (const row of rows) {
        if (typeof row.payload !== 'string') throw new Error('Registro local inválido.')
        const entity: Entity = JSON.parse(row.payload) as Entity
        if (!entity.id || !entity.storeId || !Number.isInteger(entity.version))
          throw new Error('Registro local corrompido. Preserve o backup antes de continuar.')
        ;(state[table] as Entity[]).push(entity)
      }
    }
    return state
  }
  async restoreEmpty(state: StoreState) {
    await this.driver.access(true, async (sql) => {
      const current = await this.load(sql)
      if (
        tables.some(
          (table) => !['stores', 'sync_outbox'].includes(table) && current[table].length > 0,
        )
      )
        throw new Error(
          'A restauração exige uma instalação sem cadastros ou operações. Exporte os dados atuais antes de trocar de aparelho.',
        )
      for (const table of tables) {
        await sql.execute(`DELETE FROM ${table}`)
        for (const row of state[table])
          await sql.execute(`INSERT INTO ${table}(id, store_id, payload) VALUES (?, ?, ?)`, [
            row.id,
            row.storeId,
            JSON.stringify(row),
          ])
      }
    })
  }
  read() {
    return this.driver.access(false, (sql) => this.load(sql))
  }
  transaction<T>(operation: (state: StoreState) => T) {
    return this.driver.access(true, async (sql) => {
      const state = await this.load(sql)
      const previous = new Map<string, string>()
      for (const table of tables)
        for (const row of state[table]) previous.set(`${table}/${row.id}`, JSON.stringify(row))
      const result = operation(state)
      for (const table of tables)
        for (const row of state[table]) {
          const payload = JSON.stringify(row)
          if (previous.get(`${table}/${row.id}`) !== payload)
            await sql.execute(
              `INSERT INTO ${table}(id, store_id, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET store_id=excluded.store_id, payload=excluded.payload`,
              [row.id, row.storeId, payload],
            )
        }
      return structuredClone(result)
    })
  }
}
