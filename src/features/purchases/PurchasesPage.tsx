import { useState, type FormEvent } from 'react'
import { active, type StoreState } from '../../domain/model'
import { useAppServices } from '../../app/providers/services-context'
import { useStoreData } from '../shared/useStoreData'
import { useMutation } from '../shared/useMutation'
import { brl, cents, dateTime, decimal, units } from '../../application/services/presentation'
import { field } from '../../application/services/formInputs'
import { Button } from '../../design-system/components/Button'
import { Select } from '../../design-system/components/Fields'
import { Modal } from '../../design-system/components/Overlay'
import { Alert, EmptyState } from '../../design-system/components/Feedback'
import {
  DataBoundary,
  PageTitle,
  RecordList,
  RecordRow,
  SaveButton,
} from '../../design-system/components/Workspace'
import { LineEditor, type LineDraft } from '../../design-system/components/LineEditor'
function PurchaseEditor({ data, onClose }: { data: StoreState; onClose: () => void }) {
  const { operations } = useAppServices()
  const { busy, error, run } = useMutation()
  const [requestId] = useState(() => operations!.newRequestId())
  const [lines, setLines] = useState<LineDraft[]>([{ productId: '', quantity: '1', unitCost: '0' }])
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    if (
      await run(
        () =>
          operations!.recordPurchase(
            field(form, 'supplier'),
            lines.map((i) => ({
              productId: i.productId,
              quantity: decimal(i.quantity),
              unitCost: cents(i.unitCost),
            })),
            requestId,
          ),
        'Compra recebida. Estoque e custos atualizados.',
      )
    )
      onClose()
  }
  return (
    <Modal
      open
      title="Receber compra"
      description="Confirme os produtos recebidos. Todos serão adicionados ao estoque juntos."
      onClose={busy ? () => undefined : onClose}
    >
      <form className="stack" onSubmit={submit}>
        {error && (
          <Alert title="Compra não registrada" tone="danger">
            {error}
          </Alert>
        )}
        <Select label="Fornecedor (opcional)" name="supplier">
          <option value="">Sem fornecedor</option>
          {active(data.suppliers).map((s) => (
            <option value={s.id} key={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <LineEditor lines={lines} products={active(data.products)} onChange={setLines} costs />
        <p className="muted text-small">
          Este registro recebe o estoque. Lance o pagamento como despesa no Financeiro quando ele
          acontecer.
        </p>
        <SaveButton busy={busy}>Confirmar recebimento</SaveButton>
      </form>
    </Modal>
  )
}
export function PurchasesPage() {
  const { data, error, reload } = useStoreData()
  const [editor, setEditor] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const purchase = data?.purchases.find((p) => p.id === selected)
  return (
    <div className="stack-lg">
      <PageTitle
        label="Compras"
        title="Abasteça sua loja."
        description="Receba produtos e mantenha estoque e custo atualizados."
        action={<Button onClick={() => setEditor(true)}>Receber compra</Button>}
      />
      <DataBoundary loading={!data} error={error} retry={() => void reload()}>
        {data && (
          <>
            {data.purchases.length ? (
              <RecordList>
                {data.purchases
                  .slice()
                  .reverse()
                  .map((p) => (
                    <RecordRow
                      key={p.id}
                      title={
                        data.suppliers.find((s) => s.id === p.supplierId)?.name ??
                        'Compra sem fornecedor'
                      }
                      detail={dateTime(p.completedAt)}
                      value={brl(p.total)}
                      actions={
                        <Button variant="ghost" onClick={() => setSelected(p.id)}>
                          Ver compra
                        </Button>
                      }
                    />
                  ))}
              </RecordList>
            ) : (
              <EmptyState
                title="Nenhuma compra recebida"
                description="Cadastre os produtos no estoque e registre uma compra para abastecer a loja."
              />
            )}
            {editor && <PurchaseEditor data={data} onClose={() => setEditor(false)} />}
            {purchase && (
              <Modal open title="Compra recebida" onClose={() => setSelected(null)}>
                <div className="stack">
                  <p>{dateTime(purchase.completedAt)}</p>
                  <RecordList>
                    {data.purchase_items
                      .filter((i) => i.purchaseId === purchase.id)
                      .map((i) => (
                        <RecordRow
                          key={i.id}
                          title={
                            data.products.find((p) => p.id === i.productId)?.name ??
                            'Produto arquivado'
                          }
                          detail={`${units(i.quantity)} × ${brl(i.unitCost)}`}
                          value={brl(i.subtotal)}
                        />
                      ))}
                  </RecordList>
                  <strong>Total: {brl(purchase.total)}</strong>
                </div>
              </Modal>
            )}
          </>
        )}
      </DataBoundary>
    </div>
  )
}
