import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp'
import UiKitPage from './UiKitPage'

describe('experiências do UI Kit', () => {
  it('mantém dados quando a validação falha e permite corrigir', async () => {
    renderApp(<UiKitPage />)
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'SKU' }), 'CAF-001')
    await user.click(screen.getByRole('button', { name: 'Validar exemplo' }))
    expect(screen.getByText('Informe um nome para validar o exemplo.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'SKU' })).toHaveValue('CAF-001')
    await user.type(screen.getByRole('textbox', { name: /Nome do produto/ }), 'Café')
    await user.click(screen.getByRole('button', { name: 'Validar exemplo' }))
    expect(screen.getByText('Exemplo validado. Nenhum produto foi cadastrado.')).toBeInTheDocument()
  })
  it('oferece busca vazia e recuperação sem perder a tela', async () => {
    renderApp(<UiKitPage />)
    const user = userEvent.setup()
    await user.type(screen.getByRole('searchbox'), 'arroz')
    expect(screen.getByText('Nenhum resultado no exemplo')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar pesquisa' }))
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.getByRole('button', { name: /Café especial, Mercearia/ })).toBeInTheDocument()
  })
  it('pede confirmação antes de executar a ação de exemplo', async () => {
    renderApp(<UiKitPage />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Testar confirmação' }))
    const dialog = screen.getByRole('dialog', { name: 'Remover este exemplo?' })
    await user.click(within(dialog).getByRole('button', { name: 'Voltar' }))
    expect(screen.queryByText('Ação de exemplo confirmada.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Testar confirmação' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar exemplo' }))
    expect(screen.getByText('Ação de exemplo confirmada.')).toBeInTheDocument()
  })
  it('mantém entrada manual disponível quando a câmera está indisponível', async () => {
    renderApp(<UiKitPage />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Visualizar scanner' }))
    await user.click(screen.getByRole('button', { name: 'Simular câmera indisponível' }))
    expect(screen.getByText('Câmera indisponível')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Digitar código' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar código de exemplo' }))
    expect(screen.getByText('Digite um código para testar o campo.')).toBeInTheDocument()
    await user.type(
      screen.getByRole('textbox', { name: 'Código de barras ou QR' }),
      '7891234567890',
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar código de exemplo' }))
    expect(
      screen.getByText('Código de exemplo recebido. Nenhuma consulta foi feita.'),
    ).toBeInTheDocument()
  })
  it('recupera um erro simulado e dispensa a notificação', async () => {
    renderApp(<UiKitPage />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Estados e feedback' }))
    await user.click(screen.getByRole('tab', { name: 'Erro' }))
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(screen.getByText('Pronto para continuar')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Dispensar notificação' }))
    expect(screen.queryByText('Nova tentativa concluída no exemplo.')).not.toBeInTheDocument()
  })
})
