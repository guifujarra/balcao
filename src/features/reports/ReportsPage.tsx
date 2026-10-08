import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useStoreData } from '../shared/useStoreData'
import { reportView, defaultPeriod } from '../../application/services/reports'
import {
  brl,
  dateTime,
  paymentLabels,
  movementLabels,
  units,
} from '../../application/services/presentation'
import type { PaymentMethod } from '../../domain/model'
import {
  PageTitle,
  DataBoundary,
  RecordList,
  RecordRow,
} from '../../design-system/components/Workspace'
import { PeriodFilter } from '../../design-system/components/PeriodFilter'
import { Alert, EmptyState } from '../../design-system/components/Feedback'
import { Button } from '../../design-system/components/Button'
export function ReportsPage() {
  const { data, error, reload } = useStoreData()
  const navigate = useNavigate()
  const [from, setFrom] = useState(defaultPeriod().from)
  const [to, setTo] = useState(defaultPeriod().to)
  const result = data ? reportView(data, from, to) : null
  const report = result?.report
  return (
    <div className="stack-lg">
      <PageTitle
        label="Relatórios"
        title="Entenda o ritmo da sua loja."
        description="Vendas, produtos e movimentos a partir dos dados deste aparelho."
      />
      <DataBoundary loading={!data} error={error} retry={() => void reload()}>
        <PeriodFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        {result?.error && (
          <Alert title="Revise o período" tone="warning">
            {result.error}
          </Alert>
        )}
        {data && report && (
          <>
            <RecordList>
              <RecordRow
                title="Vendas no período"
                detail={`${report.sales.length} vendas concluídas`}
                value={brl(report.revenue)}
              />
              <RecordRow
                title="Custo dos itens vendidos"
                detail="Custo registrado no momento em que cada item entrou no carrinho."
                value={brl(report.cost)}
              />
              <RecordRow
                title="Margem bruta aproximada"
                detail="Vendas após descontos menos custo dos itens; exclui despesas, taxas e tributos."
                value={brl(report.margin)}
              />
            </RecordList>
            <div className="workspace-columns">
              <section className="stack">
                <h2>Vendas por dia</h2>
                {report.byDay.length ? (
                  <RecordList>
                    {report.byDay.map(([day, total]) => (
                      <RecordRow key={day} title={day} value={brl(total)} />
                    ))}
                  </RecordList>
                ) : (
                  <EmptyState
                    title="Sem vendas neste período"
                    description="As vendas concluídas aparecerão aqui."
                  />
                )}
              </section>
              <section className="stack">
                <h2>Pagamentos registrados</h2>
                <RecordList>
                  {report.byPayment.map(([method, total]) => (
                    <RecordRow
                      key={method}
                      title={paymentLabels[method as PaymentMethod]}
                      value={brl(total)}
                    />
                  ))}
                </RecordList>
                {!report.byPayment.length && <p className="muted">Sem pagamentos no período.</p>}
              </section>
            </div>
            <section className="stack">
              <h2>Produtos com maior receita</h2>
              <p className="muted text-small">
                Valores dos itens antes do desconto geral da venda.
              </p>
              {report.bestSellers.length ? (
                <RecordList>
                  {report.bestSellers.map((p) => (
                    <RecordRow
                      key={p.id}
                      title={p.name}
                      detail={`${units(p.quantity)} ${p.unit} vendidos`}
                      value={brl(p.total)}
                    />
                  ))}
                </RecordList>
              ) : (
                <p className="muted">Nenhum produto vendido no período.</p>
              )}
            </section>
            <div className="workspace-columns">
              <section className="stack">
                <h2>Atenção ao estoque atual</h2>
                <RecordList>
                  <RecordRow
                    title="Estoque baixo"
                    value={String(report.lowStock.length)}
                    actions={
                      <Button variant="ghost" onClick={() => navigate('/estoque?filtro=baixo')}>
                        Ver produtos
                      </Button>
                    }
                  />
                  <RecordRow
                    title="Sem estoque"
                    value={String(report.zeroStock.length)}
                    actions={
                      <Button variant="ghost" onClick={() => navigate('/estoque?filtro=zerado')}>
                        Ver produtos
                      </Button>
                    }
                  />
                </RecordList>
              </section>
              <section className="stack">
                <h2>Estoque parado</h2>
                <p className="muted text-small">
                  Produtos com saldo, cadastrados há pelo menos 30 dias e sem venda nos 30 dias até
                  a data final.
                </p>
                {report.idle.length ? (
                  <RecordList>
                    {report.idle.map((p) => (
                      <RecordRow
                        key={p.id}
                        title={p.name}
                        value={`${units(p.quantity)} ${p.unit}`}
                      />
                    ))}
                  </RecordList>
                ) : (
                  <p className="muted">Nenhum produto atende a esse critério.</p>
                )}
              </section>
            </div>
            <section className="stack">
              <h2>Entradas e saídas do período</h2>
              {report.movements.length ? (
                <RecordList>
                  {report.movements
                    .slice()
                    .reverse()
                    .map((m) => (
                      <RecordRow
                        key={m.id}
                        title={
                          data.products.find((p) => p.id === m.productId)?.name ??
                          'Produto arquivado'
                        }
                        detail={`${movementLabels[m.type]} · ${dateTime(m.createdAt)} · ${m.reason}`}
                        value={`${m.quantityDelta > 0 ? '+' : ''}${units(m.quantityDelta)}`}
                      />
                    ))}
                </RecordList>
              ) : (
                <p className="muted">Sem movimentações no período.</p>
              )}
            </section>
          </>
        )}
      </DataBoundary>
    </div>
  )
}
