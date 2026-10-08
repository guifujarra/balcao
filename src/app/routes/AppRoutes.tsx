import { ReportsPage } from '../../features/reports/ReportsPage'
import { FinancePage } from '../../features/finance/FinancePage'
import { ContactsPage } from '../../features/contacts/ContactsPage'
import { PurchasesPage } from '../../features/purchases/PurchasesPage'
import { SalesPage } from '../../features/sales/SalesPage'
import { CombosPage } from '../../features/combos/CombosPage'
import { ScannerPage } from '../../features/scanner/ScannerPage'
import { ProductsPage } from '../../features/products/ProductsPage'
import { useAppServices } from '../providers/services-context'
import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { AppShell } from '../navigation/AppShell'
import { mainNavigation, moreNavigation } from '../navigation/items'
import { HomePage } from '../../features/home/HomePage'
import { MorePage } from '../../features/navigation/MorePage'
import { ModulePage, NotFoundPage } from '../../features/navigation/ModulePage'
import { SettingsPage } from '../../features/settings/SettingsPage'
import { LoadingState } from '../../design-system/components/Feedback'

import { ScanLine } from '../../design-system/icons'

const UiKitPage = lazy(() => import('../../features/dev-ui-kit/UiKitPage'))
const moduleRoutes = [...mainNavigation, ...moreNavigation].filter(
  (item) => !['/', '/mais', '/configuracoes'].includes(item.path),
)

export function AppRoutes() {
  const { dataMode } = useAppServices()
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="mais" element={<MorePage />} />
        <Route
          path="escanear"
          element={
            dataMode === 'local' ? (
              <ScannerPage />
            ) : (
              <ModulePage
                item={{
                  path: '/escanear',
                  label: 'Leitura de código',
                  description: 'Leia dentro da venda ou do cadastro',
                  icon: ScanLine,
                }}
              />
            )
          }
        />
        <Route path="configuracoes" element={<SettingsPage />} />
        <Route
          path="dev/ui-kit"
          element={
            <Suspense fallback={<LoadingState label="Abrindo os componentes…" />}>
              <UiKitPage />
            </Suspense>
          }
        />
        {moduleRoutes.map((item) => (
          <Route
            key={item.path}
            path={item.path}
            element={
              dataMode === 'local' && item.path === '/estoque' ? (
                <ProductsPage />
              ) : dataMode === 'local' && item.path === '/combos' ? (
                <CombosPage />
              ) : dataMode === 'local' && item.path === '/vendas' ? (
                <SalesPage />
              ) : dataMode === 'local' && item.path === '/compras' ? (
                <PurchasesPage />
              ) : dataMode === 'local' && item.path === '/clientes' ? (
                <ContactsPage kind="customers" key="customers" />
              ) : dataMode === 'local' && item.path === '/fornecedores' ? (
                <ContactsPage kind="suppliers" key="suppliers" />
              ) : dataMode === 'local' && item.path === '/financeiro' ? (
                <FinancePage />
              ) : dataMode === 'local' && item.path === '/relatorios' ? (
                <ReportsPage />
              ) : (
                <ModulePage item={item} />
              )
            }
          />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
