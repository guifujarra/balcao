import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { ArrowUpRight, Moon, Palette, Store, Sun } from '../../design-system/icons'
import { IconButton } from '../../design-system/components/Button'
import { Badge } from '../../design-system/components/Feedback'
import { useTheme } from '../providers/theme-context'
import { getRouteTitle, mainNavigation, moreNavigation } from './items'
import { minimizeApp, registerBackButton } from '../../platform/navigation/backButton'
import { useAppServices } from '../providers/services-context'

import { useStoreData } from '../../features/shared/useStoreData'
import { cartSummary } from '../../application/services/presentation'

export function AppShell() {
  const { data } = useStoreData()
  const cart = cartSummary(data)
  const { pathname, key: locationKey } = useLocation()
  const navigate = useNavigate()
  const main = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)
  const { resolvedTheme, setPreference } = useTheme()
  const { store, dataMode } = useAppServices()
  const title = getRouteTitle(pathname)
  useEffect(() => {
    document.title = `${title} · Balcão`
    if (previousPath.current !== pathname) {
      window.scrollTo(0, 0)
      main.current?.focus()
      previousPath.current = pathname
    }
  }, [pathname, title])
  useEffect(() => {
    let disposed = false
    let remove: (() => void) | undefined
    void registerBackButton(() => {
      if (document.querySelector('[data-scan-active="true"]')) {
        window.dispatchEvent(new Event('balcao:close-scanner'))
        return
      }
      const dialog = document.querySelector('dialog[open]')
      if (dialog) {
        dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
        return
      }
      if (pathname === '/') {
        void minimizeApp()
        return
      }
      if (locationKey === 'default') navigate('/')
      else navigate(-1)
    }).then(
      (cleanup) => {
        if (disposed) cleanup()
        else remove = cleanup
      },
      (error) => console.error('Falha ao registrar navegação nativa', error),
    )
    return () => {
      disposed = true
      remove?.()
    }
  }, [pathname, locationKey, navigate])
  const inMore = moreNavigation.some((item) => item.path === pathname) || pathname === '/dev/ui-kit'
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="Balcão, início">
          <span className="brand-mark">
            <Store aria-hidden="true" />
          </span>
          <span>
            balcão<span className="brand-dot">.</span>
            <small>Sua loja, em ordem.</small>
          </span>
        </Link>
        <span className="sidebar-label eyebrow muted">Seu espaço</span>
        <nav className="main-nav" aria-label="Navegação principal">
          {mainNavigation.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end
              aria-describedby={path === '/vendas' && cart.count ? 'sale-in-progress' : undefined}
              className={({ isActive }) =>
                `nav-item ${isActive || (path === '/mais' && inMore) ? 'nav-item--active' : ''} ${path === '/vendas' && cart.count ? 'nav-item--sale' : ''}`
              }
            >
              <span className="nav-icon">
                <Icon aria-hidden="true" />
                {path === '/vendas' && cart.count > 0 && (
                  <span className="cart-badge" aria-hidden="true">
                    {cart.count > 99 ? '99+' : cart.count}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        {cart.count > 0 && (
          <span id="sale-in-progress" className="sr-only">
            Venda em andamento: {cart.count}{' '}
            {cart.count === 1 ? 'produto no carrinho' : 'produtos no carrinho'}
          </span>
        )}
        <div className="sidebar-footer">
          <Link className="sidebar-kit-link" to="/dev/ui-kit">
            <Palette aria-hidden="true" />
            <span>Guia de componentes</span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
          <p>Feito para facilitar o dia.</p>
          <span className="version-label">Balcão · 0.2.1</span>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <div className="store-label">
            <span className="store-symbol">
              <Store aria-hidden="true" />
            </span>
            <div>
              <span className="store-caption">Seu espaço de trabalho</span>
              <strong>{store.name}</strong>
            </div>
          </div>
          <div className="row">
            <Badge tone="neutral">{dataMode === 'local' ? 'Neste aparelho' : 'Demonstração'}</Badge>
            <IconButton
              label={resolvedTheme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
              onClick={() => setPreference(resolvedTheme === 'light' ? 'dark' : 'light')}
            >
              {resolvedTheme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            </IconButton>
          </div>
        </header>
        <main id="main-content" ref={main} tabIndex={-1} className="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>Balcão. Mais tempo para a sua loja.</span>
          {dataMode === 'demonstration' && (
            <Link to="/?preview=off" reloadDocument>
              Usar meus dados
            </Link>
          )}
          <Link to="/dev/ui-kit">
            Guia de componentes <ArrowUpRight aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </div>
  )
}
