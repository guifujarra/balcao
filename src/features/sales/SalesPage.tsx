import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import {
  active,
  type SaleItem,
  type Sale,
  type StoreState,
  type PaymentMethod,
} from '../../domain/model'
import { useAppServices } from '../../app/providers/services-context'
import { useStoreData } from '../shared/useStoreData'
import { useMutation } from '../shared/useMutation'
import {
  brl,
  cents,
  dateTime,
  decimal,
  paymentLabels,
  units,
  saleQuote,
  cartSummary,
} from '../../application/services/presentation'
import { field } from '../../application/services/formInputs'
import { Button } from '../../design-system/components/Button'
import { Input, Select } from '../../design-system/components/Fields'
import { Alert, EmptyState } from '../../design-system/components/Feedback'
import { ConfirmDialog, Modal, BottomSheet } from '../../design-system/components/Overlay'
import {
  DataBoundary,
  PageTitle,
  RecordList,
  RecordRow,
  SaveButton,
} from '../../design-system/components/Workspace'
import { History, ScanLine, ShoppingBasket } from '../../design-system/icons'

function CartItem({ item }: { item: SaleItem }) {
  const { operations } = useAppServices()
  const { busy, error, run } = useMutation()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    await run(
      () => operations!.setSaleItem(item.saleId, item.productId, decimal(field(form, 'quantity'))),
      'Quantidade atualizada.',
    )
  }
  return (
    <div className="workspace-panel stack cart-line">
      <div className="spread">
        <strong>{item.productNameSnapshot}</strong>
        <strong>{brl(item.subtotal)}</strong>
      </div>
      <p className="muted text-small">
        {units(item.quantity)} × {brl(item.unitPrice)}
      </p>
      {error && (
        <Alert title="Revise a quantidade" tone="danger">
          {error}
        </Alert>
      )}
      <form className="toolbar" onSubmit={submit}>
        <Input
          label="Quantidade"
          aria-label={`Quantidade de ${item.productNameSnapshot}`}
          className="cart-quantity"
          name="quantity"
          inputMode="decimal"
          defaultValue={item.quantity}
          key={item.quantity}
          required
        />
        <Button type="submit" variant="secondary" disabled={busy}>
          Atualizar
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            void run(
              () => operations!.setSaleItem(item.saleId, item.productId, 0),
              'Item removido.',
            )
          }}
        >
          Remover
        </Button>
      </form>
    </div>
  )
}
function Checkout({
  sale,
  data,
  onCompleted,
}: {
  sale: Sale
  data: StoreState
  onCompleted: (id: string) => void
}) {
  const { operations } = useAppServices()
  const { busy, error, run } = useMutation()
  const [discount, setDiscount] = useState('0')
  const quote = saleQuote(sale, discount)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (
      await run(
        () =>
          operations!.completeSale(
            sale.id,
            field(form, 'payment') as PaymentMethod,
            cents(discount),
            field(form, 'customer'),
          ),
        'Venda finalizada. Estoque e caixa atualizados.',
      )
    )
      onCompleted(sale.id)
  }
  return (
    <form className="stack" onSubmit={submit}>
      {error && (
        <Alert title="Venda não finalizada" tone="danger">
          {error}
        </Alert>
      )}
      <div className="spread">
        <span>Subtotal</span>
        <strong>{brl(sale.subtotal)}</strong>
      </div>
      <Input
        label="Desconto (R$)"
        inputMode="decimal"
        value={discount}
        onChange={(e) => setDiscount(e.target.value)}
        required
      />
      <Select label="Forma de pagamento" name="payment">
        {Object.entries(paymentLabels).map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </Select>
      <Select label="Cliente (opcional)" name="customer">
        <option value="">Consumidor não identificado</option>
        {active(data.customers).map((c) => (
          <option value={c.id} key={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <div className="spread">
        <strong>Total da venda</strong>
        <strong>{quote}</strong>
      </div>
      <p className="muted text-small">
        Confirme o recebimento antes de finalizar. O pagamento é registrado localmente.
      </p>
      <SaveButton busy={busy}>Finalizar venda</SaveButton>
    </form>
  )
}

export function SalesPage() {
  const { data, operations, error, run, reload } = useStoreData()
  const navigate = useNavigate()
  const [cancel, setCancel] = useState(false)
  const [checkout, setCheckout] = useState(false)
  const [history, setHistory] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const cart = cartSummary(data)
  const draft = cart.sale
  const receipt = data?.sales.find((s) => s.id === receiptId)
  const scan = () => navigate('/escanear?modo=venda&auto=1')
  return (
    <div className="stack-lg sales-page">
      <PageTitle
        label="Vendas"
        title="Sua venda."
        description={
          cart.count
            ? 'Seu carrinho está salvo neste aparelho.'
            : 'A primeira leitura inicia a venda.'
        }
      />
      <DataBoundary loading={!data} error={error} retry={() => void reload()}>
        {data && (
          <>
            {cart.count && draft ? (
              <section className="stack" aria-label="Carrinho da venda">
                <div className="spread">
                  <h2>
                    Carrinho{' '}
                    <span className="muted text-small">
                      · {cart.count} {cart.count === 1 ? 'produto' : 'produtos'}
                    </span>
                  </h2>
                  <Button onClick={scan}>
                    <ScanLine aria-hidden="true" /> Escanear produtos
                  </Button>
                </div>
                <div className="surface">
                  {cart.items.map((item) => (
                    <CartItem key={item.id} item={item} />
                  ))}
                </div>
                <div className="surface workspace-panel stack sale-total-panel">
                  <div className="spread">
                    <span>Subtotal</span>
                    <strong>{brl(draft.subtotal)}</strong>
                  </div>
                  <Button onClick={() => setCheckout(true)}>Revisar e finalizar</Button>
                </div>
                <Button variant="ghost" onClick={() => setCancel(true)}>
                  Cancelar venda em aberto
                </Button>
              </section>
            ) : (
              <section className="surface sale-empty">
                <span className="sale-empty-icon">
                  <ShoppingBasket aria-hidden="true" />
                </span>
                <EmptyState
                  title="Pronto para vender"
                  description="Leia o código de barras ou o QR code do produto para adicioná-lo ao carrinho."
                  action={
                    <Button onClick={scan}>
                      <ScanLine aria-hidden="true" /> Escanear produtos
                    </Button>
                  }
                />
              </section>
            )}
            <Button variant="ghost" onClick={() => setHistory(true)}>
              <History aria-hidden="true" /> Histórico de vendas
            </Button>
            {checkout && draft && (
              <BottomSheet open title="Finalizar venda" onClose={() => setCheckout(false)}>
                <Checkout
                  sale={draft}
                  data={data}
                  onCompleted={(id) => {
                    setCheckout(false)
                    setReceiptId(id)
                  }}
                />
              </BottomSheet>
            )}
            {history && (
              <Modal open title="Histórico de vendas" onClose={() => setHistory(false)}>
                {data.sales.some((s) => s.status !== 'DRAFT') ? (
                  <RecordList>
                    {data.sales
                      .filter((s) => s.status !== 'DRAFT')
                      .slice()
                      .reverse()
                      .map((sale) => (
                        <RecordRow
                          key={sale.id}
                          title={
                            sale.status === 'COMPLETED' ? 'Venda concluída' : 'Venda cancelada'
                          }
                          detail={`${dateTime(sale.completedAt ?? sale.createdAt)} · ${paymentLabels[sale.paymentMethod]}`}
                          value={brl(sale.total)}
                          actions={
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setHistory(false)
                                setReceiptId(sale.id)
                              }}
                              aria-label={`Detalhes da venda ${sale.id.slice(0, 8)}`}
                            >
                              Detalhes
                            </Button>
                          }
                        />
                      ))}
                  </RecordList>
                ) : (
                  <EmptyState
                    title="Nenhuma venda finalizada"
                    description="As vendas concluídas aparecerão aqui."
                  />
                )}
              </Modal>
            )}
            {draft && cancel && (
              <ConfirmDialog
                open
                title="Cancelar venda em aberto?"
                description="Os itens serão descartados do carrinho. O estoque não será alterado."
                onClose={() => setCancel(false)}
                confirmLabel="Cancelar venda"
                onConfirm={() => {
                  void run(() => operations!.cancelSale(draft.id), 'Venda cancelada.').then(
                    (ok) => {
                      if (ok) setCancel(false)
                    },
                  )
                }}
              />
            )}
            {receipt && (
              <Modal
                open
                title={receipt.status === 'COMPLETED' ? 'Venda concluída' : 'Venda cancelada'}
                onClose={() => setReceiptId(null)}
              >
                <div className="stack">
                  <p className="muted">
                    {dateTime(receipt.completedAt ?? receipt.createdAt)} ·{' '}
                    {paymentLabels[receipt.paymentMethod]}
                  </p>
                  <RecordList>
                    {active(data.sale_items)
                      .filter((i) => i.saleId === receipt.id)
                      .map((i) => (
                        <RecordRow
                          key={i.id}
                          title={i.productNameSnapshot}
                          detail={`${units(i.quantity)} × ${brl(i.unitPrice)}`}
                          value={brl(i.subtotal)}
                        />
                      ))}
                  </RecordList>
                  <div className="spread">
                    <span>Desconto</span>
                    <strong>{brl(receipt.discount)}</strong>
                  </div>
                  <div className="spread">
                    <strong>Total</strong>
                    <strong>{brl(receipt.total)}</strong>
                  </div>
                  <p className="muted text-small">Registro local sem valor fiscal.</p>
                  <Button onClick={() => setReceiptId(null)}>Concluir</Button>
                </div>
              </Modal>
            )}
          </>
        )}
      </DataBoundary>
    </div>
  )
}
