import { Capacitor } from '@capacitor/core'
import '@fontsource/manrope/latin-400.css'
import '@fontsource/manrope/latin-500.css'
import '@fontsource/manrope/latin-600.css'
import '@fontsource/manrope/latin-700.css'
import './design-system/typography/global.css'
import './design-system/components/components.css'
import './app/app.css'
import './design-system/components/workspace.css'
import './features/home/home.css'
import './features/scanner/scanner.css'
import { bootstrap } from './app/bootstrap/bootstrap'

if (
  import.meta.env.PROD &&
  'serviceWorker' in navigator &&
  window.isSecureContext &&
  !Capacitor.isNativePlatform()
) {
  void navigator.serviceWorker
    .register('/sw.js')
    .catch(() => console.info('Cache offline indisponível neste navegador.'))
}

void bootstrap().catch((error) => {
  const root = document.getElementById('root')
  if (!root) return
  const panel = document.createElement('main')
  panel.className = 'workspace-panel stack'
  const title = document.createElement('h1')
  title.textContent = 'Não foi possível abrir seus dados'
  const message = document.createElement('p')
  message.textContent = error instanceof Error ? error.message : 'Falha no armazenamento local.'
  const button = document.createElement('button')
  button.className = 'button button--primary'
  button.textContent = 'Tentar novamente'
  button.onclick = () => location.reload()
  panel.append(title, message, button)
  root.replaceChildren(panel)
})
