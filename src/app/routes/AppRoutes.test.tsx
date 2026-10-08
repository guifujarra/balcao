import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './AppRoutes'
import { renderApp } from '../../test/renderApp'

describe('navegação da fundação', () => {
  it('abre os destinos principais e preserva a identificação da prévia', async () => {
    renderApp(<AppRoutes />)
    const user = userEvent.setup()
    const nav = within(screen.getByRole('navigation', { name: 'Navegação principal' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sua loja, em ordem.')
    for (const [name, title] of [
      ['Estoque', 'Cada produto, no seu lugar.'],
      ['Vendas', 'Do carrinho ao “volte sempre”.'],
      ['Mais', 'Um espaço para cada coisa.'],
    ]) {
      await user.click(nav.getByRole('link', { name }))
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title ?? '')
      expect(screen.getByRole('main')).toHaveFocus()
    }
    await user.click(screen.getByRole('link', { name: /Configurações Deixe/ }))
    expect(screen.getByRole('group', { name: 'Tema do aplicativo' })).toBeInTheDocument()
  })
  it('aceita acesso direto a uma rota', () => {
    renderApp(<AppRoutes />, '/combos')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Melhor quando vem junto.')
    expect(document.title).toBe('Combos · Balcão')
  })
  it('oferece recuperação para rota desconhecida', async () => {
    renderApp(<AppRoutes />, '/rota-inexistente')
    await userEvent.click(screen.getByRole('link', { name: 'Voltar ao início' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sua loja, em ordem.')
  })
})
