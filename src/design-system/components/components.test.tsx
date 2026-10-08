import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { Input } from './Fields'
import { Tabs } from './Tabs'

describe('controles acessíveis', () => {
  it('impede cliques duplicados durante carregamento', async () => {
    const click = vi.fn()
    render(
      <Button loading onClick={click}>
        Salvar
      </Button>,
    )
    const button = screen.getByRole('button', { name: /Salvar/ })
    await userEvent.click(button)
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(click).not.toHaveBeenCalled()
  })
  it('associa orientação de erro ao campo e preserva seu valor', () => {
    render(<Input label="Código" defaultValue="ABC" error="Confira o código." />)
    const input = screen.getByRole('textbox', { name: 'Código' })
    expect(input).toHaveAccessibleDescription('Confira o código.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveValue('ABC')
  })
  it('move o foco e a seleção das abas por teclado', async () => {
    function Example() {
      const [value, setValue] = useState('one')
      return (
        <Tabs
          label="Exemplo"
          value={value}
          onChange={setValue}
          items={[
            { value: 'one', label: 'Primeira', content: 'Painel um' },
            { value: 'two', label: 'Segunda', content: 'Painel dois' },
            { value: 'three', label: 'Terceira', content: 'Painel três' },
          ]}
        />
      )
    }
    render(<Example />)
    const user = userEvent.setup()
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Segunda' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Painel dois')
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Terceira' })).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Primeira' })).toHaveFocus()
  })
})
