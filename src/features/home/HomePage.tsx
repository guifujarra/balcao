import { Link, useNavigate } from 'react-router'
import {
  ArrowRight,
  CalendarDays,
  Layers3,
  Package,
  Plus,
  ReceiptText,
  ScanLine,
  ShoppingBasket,
  TriangleAlert,
} from '../../design-system/icons'
import { ActionTile, StatusTile } from '../../design-system/components/DashboardTiles'
import { ProductRow, StatCard } from '../../design-system/components/DataDisplay'
import { EmptyState, ErrorState, LoadingState } from '../../design-system/components/Feedback'
import { useDashboard } from './useDashboard'

export function HomePage() {
  const navigate = useNavigate()
  const { state, view, reload, isDemo } = useDashboard()
  return (
    <div className="stack-lg dashboard-page">
      <header className="dashboard-heading">
        <div className="page-heading">
          <p className="eyebrow muted">
            {view ? `${view.greeting}, que bom ter você aqui` : 'Bem-vindo ao Balcão'}
          </p>
          <h1>Sua loja, em ordem.</h1>
          <p>O essencial do seu dia, logo aqui.</p>
        </div>
        {view && (
          <span className="dashboard-date">
            <CalendarDays aria-hidden="true" />
            {view.dateLabel}
          </span>
        )}
      </header>
      {isDemo && (
        <p className="demo-indicator">
          <span className="preview-dot" aria-hidden="true" />
          <span>
            <strong>Demonstração.</strong> Valores e produtos ilustrativos.
          </span>
        </p>
      )}
      <section aria-label="Ações rápidas" className="dashboard-actions">
        <ActionTile
          label="Vender"
          description="Começar uma venda"
          icon={<ShoppingBasket />}
          prominent
          onClick={() => navigate('/escanear?modo=venda&auto=1')}
        />
        <ActionTile
          label="Produto"
          description="Adicionar ao estoque"
          icon={<Plus />}
          onClick={() => navigate('/estoque?acao=novo')}
        />
        <ActionTile
          label="Combo"
          description="Combinar produtos"
          icon={<Layers3 />}
          onClick={() => navigate('/combos?acao=novo')}
        />
      </section>
      {state.status === 'loading' && (
        <section className="surface dashboard-state">
          <LoadingState label="Preparando o resumo da loja…" />
        </section>
      )}
      {state.status === 'error' && (
        <section className="surface dashboard-state">
          <ErrorState
            title="Não conseguimos abrir o resumo"
            description="Tente carregar novamente. Você pode continuar usando a navegação."
            onRetry={reload}
          />
        </section>
      )}
      {view && (
        <>
          <section className="dashboard-stats" aria-label="Resumo de hoje">
            <StatCard
              label="Vendas de hoje"
              value={view.salesLabel}
              detail={view.salesDetail}
              highlighted
              icon={<ReceiptText />}
              action={
                <Link className="text-link" to="/vendas">
                  Ver vendas <ArrowRight aria-hidden="true" />
                </Link>
              }
            />
            <StatCard
              label="Produtos cadastrados"
              value={view.productCountLabel}
              detail="No catálogo da sua loja"
              icon={<Package />}
              action={
                <Link className="text-link" to="/estoque">
                  Ver estoque <ArrowRight aria-hidden="true" />
                </Link>
              }
            />
          </section>
          <div className="dashboard-lower">
            <section className="stack dashboard-alerts" aria-labelledby="alerts-title">
              <div className="section-heading">
                <h2 id="alerts-title">De olho no estoque</h2>
                <span className="muted">Pequenos cuidados, todo dia</span>
              </div>
              <div className="dashboard-alert-grid">
                <StatusTile
                  label="Estoque baixo"
                  value={view.lowStockLabel}
                  detail="Produtos para repor"
                  tone={view.hasProducts ? 'warning' : 'neutral'}
                  icon={<TriangleAlert />}
                  onClick={() => navigate('/estoque?filtro=baixo')}
                />
                <StatusTile
                  label="Sem estoque"
                  value={view.outOfStockLabel}
                  detail="Produtos com saldo zero"
                  tone={view.hasProducts ? 'danger' : 'neutral'}
                  icon={<Package />}
                  onClick={() => navigate('/estoque?filtro=zerado')}
                />
                <StatusTile
                  label="Vencendo"
                  value={view.expiringLabel}
                  detail={view.expirationDetail}
                  tone={view.hasProducts ? 'info' : 'neutral'}
                  icon={<CalendarDays />}
                  onClick={() => navigate('/estoque?filtro=validade')}
                />
              </div>
              <div className="dashboard-tip">
                <ScanLine aria-hidden="true" />
                <p>
                  Tem o produto em mãos?
                  <br />
                  <Link className="text-link" to="/escanear?modo=venda&auto=1">
                    Escanear para vender <ArrowRight aria-hidden="true" />
                  </Link>
                </p>
              </div>
            </section>
            <section className="stack dashboard-products" aria-labelledby="recent-title">
              <div className="section-heading">
                <h2 id="recent-title">Produtos recentes</h2>
                <Link to="/estoque" className="text-link">
                  Ver todos <ArrowRight aria-hidden="true" />
                </Link>
              </div>
              <div className="surface kit-list">
                {view.recentProducts.length ? (
                  view.recentProducts.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      onClick={() => navigate(`/estoque?produto=${product.id}`)}
                    />
                  ))
                ) : (
                  <EmptyState
                    title={
                      view.hasProducts
                        ? 'Sem produtos recentes'
                        : 'Sua loja começa pelo primeiro produto'
                    }
                    description={
                      view.hasProducts
                        ? 'Os produtos consultados recentemente aparecerão aqui.'
                        : 'Organize seu catálogo para acompanhar o estoque e começar a vender.'
                    }
                    action={
                      <Link className="button button--primary" to="/estoque?acao=novo">
                        <Plus aria-hidden="true" />
                        Cadastrar produto
                      </Link>
                    }
                  />
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
