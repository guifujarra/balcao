import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/renderApp'
import { createDemoServices } from '../../app/bootstrap/createDemoServices'
import { GetDashboardSummary } from '../../application/dashboard/GetDashboardSummary'
import { HomePage } from './HomePage'
import { AppRoutes } from '../../app/routes/AppRoutes'

describe('Home visual por contrato', () => {
  it('mostra loading antes de renderizar indicadores e produtos demonstrativos', async () => {
    renderApp(<HomePage />)
    expect(screen.getByText('Preparando o resumo da loja…')).toBeInTheDocument()
    expect(await screen.findByText('23 vendas realizadas')).toBeInTheDocument()
    expect(screen.getByText(/Valores e produtos ilustrativos/)).toBeInTheDocument()
    expect(screen.getByText('R$ 1.284,50', { exact: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Leite integral, Laticínios/ })).toHaveAccessibleName(
      /Estoque baixo/,
    )
    expect(screen.getByRole('button', { name: /Arroz branco 5 kg/ })).toHaveAccessibleName(
      /Sem estoque/,
    )
  })
  it('exibe o primeiro passo e valores zerados quando a loja está vazia', async () => {
    renderApp(<HomePage />, '/', createDemoServices('empty', 0))
    expect(await screen.findByText('Sua loja começa pelo primeiro produto')).toBeInTheDocument()
    expect(screen.getByText('0 vendas realizadas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cadastrar produto' })).toHaveAttribute(
      'href',
      '/estoque?acao=novo',
    )
    expect(screen.queryByRole('button', { name: /Café especial/ })).not.toBeInTheDocument()
  })
  it('recupera a leitura após uma falha sem perder as ações rápidas', async () => {
    renderApp(<HomePage />, '/', createDemoServices('retry', 0))
    expect(await screen.findByText('Não conseguimos abrir o resumo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Vender.*Começar uma venda/ })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('23 vendas realizadas')).toBeInTheDocument()
    expect(screen.queryByText('Não conseguimos abrir o resumo')).not.toBeInTheDocument()
  })
  it('cancela a consulta ao sair da tela', async () => {
    const services = createDemoServices('ready', 0)
    const getSummary = vi.fn((signal?: AbortSignal) => {
      expect(signal).toBeInstanceOf(AbortSignal)
      return new Promise<never>((_, reject) =>
        signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Cancelado', 'AbortError')),
          { once: true },
        ),
      )
    })
    services.dashboard = new GetDashboardSummary({ getSummary })
    const { unmount } = renderApp(<HomePage />, '/', services)
    await waitFor(() => expect(getSummary).toHaveBeenCalledTimes(1))
    const signal = getSummary.mock.calls[0]?.[0]
    unmount()
    expect(signal?.aborted).toBe(true)
  })
  it('mantém contexto de produto e filtro ao abrir o módulo correspondente', async () => {
    renderApp(<AppRoutes />)
    await screen.findByText('23 vendas realizadas')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Estoque baixo.*Produtos para repor/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Cada produto, no seu lugar.',
    )
    await user.click(within(screen.getByRole('navigation')).getByRole('link', { name: 'Início' }))
    await screen.findByText('23 vendas realizadas')
    await user.click(screen.getByRole('button', { name: /Combo.*Combinar produtos/ }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Melhor quando vem junto.')
  })
})
