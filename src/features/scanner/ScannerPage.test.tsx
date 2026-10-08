import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/renderApp'
import { AppRoutes } from '../../app/routes/AppRoutes'
import { createDemoServices } from '../../app/bootstrap/createDemoServices'
import { StoreService } from '../../application/services/StoreService'
import { MemoryStoreRepository } from '../../test/MemoryStoreRepository'
import { productCode } from '../../domain/rules'
const feedback = vi.hoisted(() => ({ successFeedback: vi.fn() }))
vi.mock('../../platform/feedback/haptics', () => feedback)
async function setup() {
  const operations = new StoreService(new MemoryStoreRepository(), {
    id: () => crypto.randomUUID(),
    now: () => '2026-10-02T12:00:00Z',
  })
  await operations.initialize()
  const input = {
    name: 'Café',
    barcode: '789001',
    sku: '',
    categoryId: '',
    salePrice: 500,
    costPrice: 200,
    minimumStock: 0,
    unit: 'un' as const,
    expirationDate: '',
  }
  const product = await operations.saveProduct(input, undefined, 10)
  const custom = await operations.saveProduct(
    { ...input, name: 'Doce artesanal', barcode: '' },
    undefined,
    5,
  )
  let receive: (code: string) => void = () => undefined
  const scanner = {
    unavailableReason: () => null,
    startScan: vi.fn(async (_id: string, callback: (code: string) => void) => {
      receive = callback
    }),
    stopScan: vi.fn(async () => undefined),
    torchAvailable: vi.fn(async () => true),
    setTorch: vi.fn(async () => undefined),
  }
  const services = {
    ...createDemoServices('ready', 0),
    dataMode: 'local' as const,
    operations,
    scanner,
  }
  renderApp(<AppRoutes />, '/escanear?modo=venda&auto=1', services)
  await waitFor(() => expect(scanner.startScan).toHaveBeenCalledTimes(1))
  return { operations, scanner, product, custom, receive: (code: string) => receive(code) }
}
beforeEach(() => vi.clearAllMocks())
describe('leitura durante a venda', () => {
  it('inicia na primeira leitura, mantém a câmera e preserva leituras rápidas', async () => {
    const { operations, scanner, custom, receive } = await setup()
    expect((await operations.read()).sales).toHaveLength(0)
    await act(async () => {
      receive('789001')
      receive(productCode(custom.id))
      receive('789001')
    })
    await waitFor(() => expect(feedback.successFeedback).toHaveBeenCalledTimes(3))
    const state = await operations.read()
    expect(state.sales).toHaveLength(1)
    expect(state.sale_items.map((i) => i.quantity)).toEqual([2, 1])
    expect(state.sales[0]?.subtotal).toBe(1500)
    expect(scanner.stopScan).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Escanear produtos' })).toBeVisible()
    expect(screen.getByText('Café adicionado à venda.')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: /Ver carrinho/ }))
    expect(scanner.stopScan).toHaveBeenCalled()
    expect(await screen.findByRole('heading', { name: 'Sua venda.' })).toBeVisible()
    const nav = within(screen.getByRole('navigation'))
    expect(nav.queryByRole('link', { name: 'Escanear' })).not.toBeInTheDocument()
    expect(nav.getByRole('link', { name: 'Vendas' })).toHaveAccessibleDescription(
      'Venda em andamento: 2 produtos no carrinho',
    )
    await userEvent.click(nav.getByRole('link', { name: 'Estoque' }))
    expect(nav.getByRole('link', { name: 'Vendas' })).toHaveAccessibleDescription(
      /Venda em andamento/,
    )
  })
  it('permite digitar, retomar a câmera e voltar mantendo o carrinho', async () => {
    const { scanner, receive, operations } = await setup()
    await act(async () => receive('789001'))
    await userEvent.click(screen.getByRole('button', { name: 'Digitar código' }))
    expect(screen.queryByRole('dialog', { name: 'Escanear produtos' })).not.toBeInTheDocument()
    expect(scanner.stopScan).toHaveBeenCalled()
    await userEvent.type(screen.getByRole('textbox', { name: /Código de barras ou QR/ }), '789001')
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar à venda' }))
    await waitFor(() => expect(feedback.successFeedback).toHaveBeenCalledTimes(2))
    await userEvent.click(screen.getByRole('button', { name: 'Abrir câmera' }))
    await waitFor(() => expect(scanner.startScan).toHaveBeenCalledTimes(2))
    const torch = await screen.findByRole('button', { name: 'Lanterna' })
    await userEvent.click(torch)
    await waitFor(() => expect(torch).toHaveAttribute('aria-pressed', 'true'))
    expect(scanner.setTorch).toHaveBeenCalledWith(true)
    await userEvent.keyboard('{Escape}')
    expect(await screen.findByRole('heading', { name: 'Sua venda.' })).toBeVisible()
    expect((await operations.read()).sale_items[0]?.quantity).toBe(2)
    expect(document.documentElement).not.toHaveClass('camera-open')
  })
  it('não vibra nem cria um carrinho quando o código é desconhecido', async () => {
    const { receive, operations } = await setup()
    await act(async () => receive('99999'))
    expect(await screen.findByText('Produto ainda não cadastrado')).toBeVisible()
    expect((await operations.read()).sales).toHaveLength(0)
    expect(feedback.successFeedback).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Escanear produtos' })).toBeVisible()
  })
  it('só confirma depois da gravação e permite continuar após uma falha', async () => {
    const { operations, receive } = await setup()
    let reject: (error: Error) => void = () => undefined
    vi.spyOn(operations, 'addScannedProduct').mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail
        }),
    )
    await act(async () => receive('789001'))
    expect(feedback.successFeedback).not.toHaveBeenCalled()
    await act(async () => reject(new Error('Falha ao gravar')))
    expect(await screen.findByText('Falha ao gravar')).toBeVisible()
    expect(feedback.successFeedback).not.toHaveBeenCalled()
    await act(async () => receive('789001'))
    expect(await screen.findByText('Café adicionado à venda.')).toBeVisible()
    expect(feedback.successFeedback).toHaveBeenCalledTimes(1)
  })
})
