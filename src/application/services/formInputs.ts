import { cents, decimal } from './presentation'
import type { Product } from '../../domain/model'
export const field = (data: FormData, name: string) => String(data.get(name) ?? '').trim()
export function productInput(data: FormData, categoryId: string) {
  return {
    name: field(data, 'name'),
    barcode: field(data, 'barcode'),
    sku: field(data, 'sku'),
    categoryId,
    salePrice: cents(field(data, 'salePrice')),
    costPrice: cents(field(data, 'costPrice') || '0'),
    minimumStock: decimal(field(data, 'minimumStock') || '0'),
    unit: field(data, 'unit') as Product['unit'],
    expirationDate: field(data, 'expirationDate'),
  }
}
export const moneyInput = (value: number) => (value / 100).toFixed(2)
