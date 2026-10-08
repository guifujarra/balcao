export interface SqlSession {
  execute(sql: string, values?: (string | number | null)[]): Promise<void>
  query(sql: string, values?: (string | number | null)[]): Promise<Record<string, unknown>[]>
}
export interface SqlDriver {
  access<T>(write: boolean, operation: (sql: SqlSession) => Promise<T>): Promise<T>
}
