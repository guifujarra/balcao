import { describe, expect, it } from 'vitest'
import { presentDashboard } from './dashboardPresentation'
import type {
  DashboardSummary,
  CurrentStore,
} from '../../application/dashboard/DashboardRepository'

const store: CurrentStore = {
  id: 'store',
  name: 'Loja',
  timezone: 'America/Sao_Paulo',
  currency: 'BRL',
}
const summary: DashboardSummary = {
  asOf: '2026-09-29T02:00:00Z',
  salesTodayCents: 123456,
  completedSalesCount: 1,
  productCount: 1,
  lowStockCount: 0,
  outOfStockCount: 0,
  expiringSoonCount: 0,
  expirationWindowDays: 7,
  recentProducts: [],
}

describe('apresentação do resumo', () => {
  it('formata valores em centavos e usa o fuso da loja', () => {
    const view = presentDashboard(summary, store)
    expect(view.salesLabel.replaceAll('\u00a0', ' ')).toBe('R$ 1.234,56')
    expect(view.salesDetail).toBe('1 venda realizada')
    expect(view.greeting).toBe('Boa noite')
    expect(view.dateLabel).toBe('28 de setembro')
  })
  it('mantém zerados e plurais legíveis', () => {
    const view = presentDashboard({ ...summary, completedSalesCount: 0, productCount: 0 }, store)
    expect(view.salesDetail).toBe('0 vendas realizadas')
    expect(view.hasProducts).toBe(false)
  })
})
