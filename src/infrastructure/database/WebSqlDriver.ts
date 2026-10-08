import type { Database, SqlJsStatic } from 'sql.js'
import type { SqlDriver, SqlSession } from './SqlDriver'
interface Snapshot {
  revision: number
  bytes: Uint8Array
}
export class WebSqlDriver implements SqlDriver {
  private sql: SqlJsStatic
  private storage: IDBDatabase
  private queue: Promise<unknown> = Promise.resolve()
  private constructor(sql: SqlJsStatic, storage: IDBDatabase) {
    this.sql = sql
    this.storage = storage
  }
  static async open(sql: SqlJsStatic, name = 'balcao-sqlite-v1') {
    const storage = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, 1)
      request.onupgradeneeded = () => request.result.createObjectStore('database')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () =>
        reject(
          new Error(
            'Não foi possível abrir o armazenamento local. Verifique se o navegador permite salvar dados.',
          ),
        )
      request.onblocked = () => reject(new Error('Feche outras abas do Balcão e tente novamente.'))
    })
    return new WebSqlDriver(sql, storage)
  }
  close() {
    this.storage.close()
  }
  private load() {
    return new Promise<Snapshot | undefined>((resolve, reject) => {
      const tx = this.storage.transaction('database', 'readonly')
      const req = tx.objectStore('database').get('main')
      req.onsuccess = () => resolve(req.result as Snapshot | undefined)
      req.onerror = () => reject(req.error)
    })
  }
  private save(revision: number, bytes: Uint8Array) {
    return new Promise<boolean>((resolve, reject) => {
      const tx = this.storage.transaction('database', 'readwrite')
      const store = tx.objectStore('database')
      const req = store.get('main')
      let saved = false
      req.onsuccess = () => {
        const existing = req.result as Snapshot | undefined
        if ((existing?.revision ?? 0) === revision) {
          store.put({ revision: revision + 1, bytes }, 'main')
          saved = true
        }
      }
      tx.oncomplete = () => resolve(saved)
      tx.onerror = () =>
        reject(
          new Error(
            'Não foi possível salvar os dados. Verifique o espaço disponível e tente novamente.',
          ),
        )
      tx.onabort = () =>
        reject(new Error('Gravação interrompida. Nenhuma alteração foi confirmada.'))
    })
  }
  access<T>(write: boolean, operation: (sql: SqlSession) => Promise<T>): Promise<T> {
    const task = this.queue.then(async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const snapshot = await this.load()
        const db = new this.sql.Database(snapshot?.bytes)
        try {
          const result = await this.inDatabase(db, operation)
          if (!write || (await this.save(snapshot?.revision ?? 0, db.export()))) return result
        } finally {
          db.close()
        }
      }
      throw new Error('Outra aba está alterando os dados. Tente novamente.')
    })
    this.queue = task.catch(() => undefined)
    return task
  }
  private async inDatabase<T>(db: Database, operation: (sql: SqlSession) => Promise<T>) {
    db.run('PRAGMA foreign_keys=ON; BEGIN TRANSACTION;')
    const session: SqlSession = {
      execute: async (sql, values) => {
        db.run(sql, values)
      },
      query: async (sql, values) => {
        const stmt = db.prepare(sql)
        const rows: Record<string, unknown>[] = []
        try {
          if (values) stmt.bind(values)
          while (stmt.step()) rows.push(stmt.getAsObject())
          return rows
        } finally {
          stmt.free()
        }
      },
    }
    try {
      const result = await operation(session)
      db.run('COMMIT')
      return result
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  }
}
