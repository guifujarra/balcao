import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite'
import type { SqlDriver, SqlSession } from './SqlDriver'
export class NativeSqlDriver implements SqlDriver {
  private db: SQLiteDBConnection
  private queue: Promise<unknown> = Promise.resolve()
  private constructor(db: SQLiteDBConnection) {
    this.db = db
  }
  static async open() {
    const manager = new SQLiteConnection(CapacitorSQLite)
    await manager.checkConnectionsConsistency()
    const db = (await manager.isConnection('balcao', false)).result
      ? await manager.retrieveConnection('balcao', false)
      : await manager.createConnection('balcao', false, 'no-encryption', 1, false)
    await db.open()
    await db.execute('PRAGMA foreign_keys=ON;', false)
    return new NativeSqlDriver(db)
  }
  access<T>(_write: boolean, operation: (sql: SqlSession) => Promise<T>): Promise<T> {
    const task = this.queue.then(async () => {
      const session: SqlSession = {
        execute: async (sql, values) => {
          if (values) await this.db.run(sql, values, false)
          else await this.db.execute(sql, false)
        },
        query: async (sql, values) =>
          ((await this.db.query(sql, values)).values as Record<string, unknown>[]) ?? [],
      }
      await this.db.beginTransaction()
      try {
        const result = await operation(session)
        await this.db.commitTransaction()
        return result
      } catch (error) {
        await this.db.rollbackTransaction()
        throw error
      }
    })
    this.queue = task.catch(() => undefined)
    return task
  }
}
