import { useState, type FormEvent } from 'react'
import type { PaymentMethod } from '../../domain/model'
import { useAppServices } from '../../app/providers/services-context'
import { useStoreData } from '../shared/useStoreData'
import { useMutation } from '../shared/useMutation'
import { brl, cents, dateTime, paymentLabels } from '../../application/services/presentation'
import { field } from '../../application/services/formInputs'
import { cashExpected, defaultPeriod, financeView } from '../../application/services/reports'
import { Button } from '../../design-system/components/Button'
import { Input, Select } from '../../design-system/components/Fields'
import { Alert, EmptyState } from '../../design-system/components/Feedback'
import { Modal } from '../../design-system/components/Overlay'
import {
  DataBoundary,
  PageTitle,
  RecordList,
  RecordRow,
  SaveButton,
} from '../../design-system/components/Workspace'
import { PeriodFilter } from '../../design-system/components/PeriodFilter'
function FinanceForm({
  kind,
  onClose,
}: {
  kind: 'expense' | 'open' | 'close'
  onClose: () => void
}) {
  const { operations } = useAppServices()
  const { busy, error, run } = useMutation()
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    if (
      await run(
        () =>
          kind === 'expense'
            ? operations!.recordExpense(
                field(form, 'description'),
                cents(field(form, 'amount')),
                field(form, 'date'),
                field(form, 'payment') as PaymentMethod,
              )
            : kind === 'open'
              ? operations!.openCash(cents(field(form, 'amount')))
              : operations!.closeCash(cents(field(form, 'amount'))),
        kind === 'expense'
          ? 'Despesa registrada.'
          : kind === 'open'
            ? 'Caixa aberto.'
            : 'Caixa fechado.',
      )
    )
      onClose()
  }
  return (
    <Modal
      open
      title={kind === 'expense' ? 'Nova despesa' : kind === 'open' ? 'Abrir caixa' : 'Fechar caixa'}
      onClose={busy ? () => undefined : onClose}
    >
      <form className="stack" onSubmit={submit}>
        {error && (
          <Alert title="Não foi possível registrar" tone="danger">
            {error}
          </Alert>
        )}
        {kind === 'expense' && (
          <Input label="Descrição da despesa" name="description" required maxLength={160} />
        )}
        <Input
          label={
            kind === 'expense'
              ? 'Valor (R$)'
              : kind === 'open'
                ? 'Dinheiro inicial (R$)'
                : 'Dinheiro contado (R$)'
          }
          name="amount"
          inputMode="decimal"
          required
        />
        {kind === 'expense' && (
          <>
            <Input
              label="Data da despesa"
              name="date"
              type="date"
              defaultValue={operations!.today()}
              required
            />
            <Select label="Pagamento da despesa" name="payment">
              {Object.entries(paymentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </>
        )}
        {kind === 'close' && (
          <p className="muted">Conte o dinheiro físico. Pix e cartão ficam fora dessa contagem.</p>
        )}
        <SaveButton busy={busy}>
          {kind === 'expense'
            ? 'Registrar despesa'
            : kind === 'open'
              ? 'Confirmar abertura'
              : 'Confirmar fechamento'}
        </SaveButton>
      </form>
    </Modal>
  )
}
export function FinancePage() {
  const { data, error, reload } = useStoreData()
  const [from, setFrom] = useState(defaultPeriod().from)
  const [to, setTo] = useState(defaultPeriod().to)
  const [form, setForm] = useState<'expense' | 'open' | 'close' | null>(null)
  const session = data?.cash_sessions.find((c) => !c.closedAt)
  const result = data ? financeView(data, from, to) : null
  return (
    <div className="stack-lg">
      <PageTitle
        label="Financeiro"
        title="O dinheiro da loja, às claras."
        description="Caixa, vendas e despesas em um só lugar."
        action={<Button onClick={() => setForm('expense')}>Nova despesa</Button>}
      />
      <DataBoundary loading={!data} error={error} retry={() => void reload()}>
        {data && (
          <>
            <section className="surface workspace-panel stack">
              <div className="spread">
                <h2>{session ? 'Caixa aberto' : 'Caixa fechado'}</h2>
                <Button variant="secondary" onClick={() => setForm(session ? 'close' : 'open')}>
                  {session ? 'Fechar caixa' : 'Abrir caixa'}
                </Button>
              </div>
              {session ? (
                <>
                  <p className="muted">Aberto em {dateTime(session.createdAt)}</p>
                  <div className="spread">
                    <span>Dinheiro esperado no caixa</span>
                    <strong>{brl(cashExpected(data, session))}</strong>
                  </div>
                </>
              ) : (
                <p className="muted">
                  Abra o caixa para acompanhar o dinheiro físico desta sessão.
                </p>
              )}
            </section>
            <PeriodFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
            {result?.error && (
              <Alert title="Revise o período" tone="warning">
                {result.error}
              </Alert>
            )}
            {result?.report && (
              <>
                <RecordList>
                  <RecordRow title="Vendas concluídas" value={brl(result.report.revenue)} />
                  <RecordRow title="Despesas registradas" value={brl(result.report.expenseTotal)} />
                  <RecordRow
                    title="Saldo do período"
                    detail="Vendas menos despesas registradas; não representa lucro."
                    value={brl(result.report.balance)}
                  />
                </RecordList>
                <section className="stack">
                  <h2>Despesas do período</h2>
                  {result.report.expenses.length ? (
                    <RecordList>
                      {result.report.expenses
                        .slice()
                        .reverse()
                        .map((e) => (
                          <RecordRow
                            key={e.id}
                            title={e.description}
                            detail={`${e.date} · ${paymentLabels[e.paymentMethod]}`}
                            value={brl(e.amount)}
                          />
                        ))}
                    </RecordList>
                  ) : (
                    <EmptyState
                      title="Nenhuma despesa no período"
                      description="Registre pagamentos, contas e outros gastos da loja."
                    />
                  )}
                </section>
              </>
            )}
            <section className="stack">
              <h2>Fechamentos de caixa</h2>
              {data.cash_sessions.filter((c) => c.closedAt).length ? (
                <RecordList>
                  {data.cash_sessions
                    .filter((c) => c.closedAt)
                    .slice()
                    .reverse()
                    .map((c) => (
                      <RecordRow
                        key={c.id}
                        title={dateTime(c.closedAt!)}
                        detail={`Esperado: ${brl(c.expectedAmount ?? 0)} · Contado: ${brl(c.closingAmount ?? 0)}`}
                      />
                    ))}
                </RecordList>
              ) : (
                <p className="muted">Os fechamentos ficarão registrados aqui.</p>
              )}
            </section>
            {form && <FinanceForm kind={form} onClose={() => setForm(null)} />}
          </>
        )}
      </DataBoundary>
    </div>
  )
}
