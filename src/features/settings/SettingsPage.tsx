import { StoreSettings } from './StoreSettings'
import { useTheme, type ThemePreference } from '../../app/providers/theme-context'
import { Alert } from '../../design-system/components/Feedback'
import { Check, Monitor, Moon, Sun } from '../../design-system/icons'

const themes = [
  { value: 'light', label: 'Claro', description: 'Leve e acolhedor', icon: Sun },
  { value: 'dark', label: 'Escuro', description: 'Conforto em pouca luz', icon: Moon },
  { value: 'system', label: 'Automático', description: 'Acompanha o aparelho', icon: Monitor },
] satisfies { value: ThemePreference; label: string; description: string; icon: typeof Sun }[]

export function SettingsPage() {
  const { preference, setPreference, storageError } = useTheme()
  return (
    <div className="stack-lg">
      <header className="page-heading">
        <p className="eyebrow muted">Configurações</p>
        <h1>Do seu jeito.</h1>
        <p>Pequenos ajustes para um dia mais confortável.</p>
      </header>
      <section className="settings-section surface">
        <div className="stack">
          <h2>Aparência</h2>
          <p className="muted">Escolha como você quer ver o Balcão.</p>
        </div>
        <fieldset className="theme-choices">
          <legend className="sr-only">Tema do aplicativo</legend>
          {themes.map(({ value, label, description, icon: Icon }) => (
            <label
              className={`theme-choice ${preference === value ? 'theme-choice--selected' : ''}`}
              key={value}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={preference === value}
                onChange={() => setPreference(value)}
              />
              <Icon aria-hidden="true" />
              <strong>{label}</strong>
              <span>{description}</span>
              {preference === value && <Check className="theme-check" aria-hidden="true" />}
            </label>
          ))}
        </fieldset>
        <p className="muted">Sua preferência é salva neste dispositivo.</p>
        {storageError && (
          <Alert tone="warning" title="Preferência aplicada nesta sessão">
            O dispositivo não permitiu salvar o tema. Ao reabrir, pode ser necessário escolhê-lo
            novamente.
          </Alert>
        )}
      </section>
      <StoreSettings />
      <section className="settings-about">
        <span className="eyebrow muted">Sobre o aplicativo</span>
        <div className="spread">
          <strong>Balcão</strong>
          <span className="muted">Versão 0.2.1</span>
        </div>
        <p className="muted">Um jeito simples de cuidar da sua loja.</p>
      </section>
    </div>
  )
}
