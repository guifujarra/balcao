import type { Product } from './model'
export class DomainError extends Error {
  override name = 'DomainError'
}
export function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DomainError(message)
}
export function text(value: string, label: string, max = 160) {
  const result = value.trim()
  requireThat(
    result.length > 0 && result.length <= max,
    `${label}: informe de 1 a ${max} caracteres.`,
  )
  return result
}
export function money(value: number) {
  requireThat(
    Number.isSafeInteger(value) && value >= 0 && value <= 100_000_000_00,
    'Valor monetário inválido.',
  )
  return value
}
export function quantity(value: number, allowZero = false) {
  requireThat(
    Number.isFinite(value) &&
      value >= (allowZero ? 0 : 0.001) &&
      value <= 1_000_000 &&
      Math.abs(value * 1000 - Math.round(value * 1000)) < 0.00001,
    'Quantidade inválida. Use até três casas decimais.',
  )
  return value
}
export function productQuantity(product: Product, value: number, allowZero = false) {
  quantity(value, allowZero)
  requireThat(
    product.unit !== 'un' || Number.isInteger(value),
    'Produtos em unidades exigem quantidade inteira.',
  )
  return value
}
export const addQuantity = (a: number, b: number) => Math.round((a + b) * 1000) / 1000
export function lineTotal(price: number, count: number) {
  return money(Math.round(money(price) * quantity(count)))
}
export function dateOnly(value: string) {
  requireThat(
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      Number.isFinite(new Date(`${value}T12:00:00Z`).getTime()) &&
      new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value,
    'Data inválida.',
  )
  return value
}
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function appCode(kind: 'produto' | 'combo', id: string) {
  requireThat(uuidPattern.test(id), 'Identificador inválido.')
  return `app:v1:${kind}:${id}`
}
export const comboCode = (id: string) => appCode('combo', id)
export const productCode = (id: string) => appCode('produto', id)
export function readAppCode(code: string) {
  if (!code.startsWith('app:')) return null
  const match = /^app:v1:(produto|combo):(.+)$/.exec(code)
  requireThat(
    match?.[2] && uuidPattern.test(match[2]),
    'QR do Balcão inválido ou versão não suportada.',
  )
  return { kind: match[1] as 'produto' | 'combo', id: match[2] }
}
export function readComboCode(code: string) {
  const value = readAppCode(code)
  return value?.kind === 'combo' ? value.id : null
}
export function dayInZone(date: string, timezone = 'America/Sao_Paulo') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date))
}
