import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useAppServices } from '../../app/providers/services-context'
import { active, type Combo, type StoreState } from '../../domain/model'
import { useStoreData } from '../shared/useStoreData'
import { useMutation } from '../shared/useMutation'
import { brl, cents, decimal, units } from '../../application/services/presentation'
import { field, moneyInput } from '../../application/services/formInputs'
import { Button } from '../../design-system/components/Button'
import { Input, SearchField, Select } from '../../design-system/components/Fields'
import { Modal, BottomSheet, ConfirmDialog } from '../../design-system/components/Overlay'
import { Alert, EmptyState } from '../../design-system/components/Feedback'
import {
  DataBoundary,
  PageTitle,
  RecordList,
  RecordRow,
  SaveButton,
} from '../../design-system/components/Workspace'
import { LineEditor, type LineDraft } from '../../design-system/components/LineEditor'

import { QrPanel } from '../shared/QrPanel'

function ComboEditor({
  combo,
  data,
  onClose,
}: {
  combo?: Combo
  data: StoreState
  onClose: () => void
}) {
  const { operations } = useAppServices()
  const { busy, error, run } = useMutation()
  const [lines, setLines] = useState<LineDraft[]>(
    combo
      ? active(data.combo_items)
          .filter((i) => i.comboId === combo.id)
          .map((i) => ({ productId: i.productId, quantity: String(i.quantity), unitCost: '0' }))
      : [{ productId: '', quantity: '1', unitCost: '0' }],
  )
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const ok = await run(
      () =>
        operations!.saveCombo(
          field(form, 'name'),
          field(form, 'description'),
          cents(field(form, 'price') || '0'),
          lines.map((i) => ({ productId: i.productId, quantity: decimal(i.quantity) })),
          combo?.id,
        ),
      'Combo salvo.',
    )
    if (ok) onClose()
  }
  return (
    <Modal
      open
      title={combo ? 'Editar combo' : 'Novo combo'}
      onClose={busy ? () => undefined : onClose}
    >
      <form onSubmit={submit} className="stack">
        {error && (
          <Alert tone="danger" title="Revise o combo">
            {error}
          </Alert>
        )}
        <Input
          label="Nome do combo"
          name="name"
          required
          defaultValue={combo?.name}
          maxLength={160}
        />
        <Input
          label="Descrição"
          name="description"
          defaultValue={combo?.description}
          maxLength={1000}
        />
        <Input
          label="Preço de referência (R$)"
          name="price"
          inputMode="decimal"
          defaultValue={moneyInput(combo?.salePrice ?? 0)}
          hint="A movimentação do combo altera estoque, sem registrar uma venda."
        />
        <LineEditor lines={lines} onChange={setLines} products={active(data.products)} />
        <SaveButton busy={busy}>Salvar combo</SaveButton>
      </form>
    </Modal>
  )
}
function ComboMovement({ combo, onClose }: { combo: Combo; onClose: () => void }) {
  const { operations } = useAppServices()
  const { busy, error, run } = useMutation()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (
      await run(
        () =>
          operations!.applyCombo(
            combo.id,
            decimal(field(form, 'count')),
            field(form, 'direction') as 'IN' | 'OUT',
            field(form, 'reason'),
          ),
        'Todos os componentes foram movimentados.',
      )
    )
      onClose()
  }
  return (
    <BottomSheet
      open
      title="Movimentar combo"
      description={combo.name}
      onClose={busy ? () => undefined : onClose}
    >
      <form className="stack" onSubmit={submit}>
        {error && (
          <Alert tone="danger" title="Nenhum item foi movimentado">
            {error}
          </Alert>
        )}
        <Select label="Operação do combo" name="direction">
          <option value="OUT">Saída de estoque</option>
          <option value="IN">Entrada de estoque</option>
        </Select>
        <Input
          label="Número de combos"
          name="count"
          inputMode="numeric"
          defaultValue="1"
          required
        />
        <Input label="Motivo do combo" name="reason" required maxLength={160} />
        <SaveButton busy={busy}>Confirmar movimentação</SaveButton>
      </form>
    </BottomSheet>
  )
}
function ComboDetails({
  combo,
  data,
  onClose,
  onEdit,
  onMove,
  onArchive,
}: {
  combo: Combo
  data: StoreState
  onClose: () => void
  onEdit: () => void
  onMove: () => void
  onArchive: () => void
}) {
  return (
    <Modal open title={combo.name} onClose={onClose}>
      <div className="stack">
        <p>{combo.description}</p>
        <strong>{brl(combo.salePrice)}</strong>
        <QrPanel value={combo.qrPayload} name={combo.name} kind="combo" />
        <RecordList>
          {active(data.combo_items)
            .filter((i) => i.comboId === combo.id)
            .map((i) => (
              <RecordRow
                key={i.id}
                title={data.products.find((p) => p.id === i.productId)?.name ?? 'Produto arquivado'}
                value={units(i.quantity)}
              />
            ))}
        </RecordList>
        <div className="form-actions">
          <Button onClick={onMove}>Movimentar combo</Button>
          <Button variant="secondary" onClick={onEdit}>
            Editar combo
          </Button>
          <Button variant="danger" onClick={onArchive}>
            Arquivar combo
          </Button>
        </div>
      </div>
    </Modal>
  )
}
export function CombosPage() {
  const { data, operations, busy, error, run, reload } = useStoreData()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<string | null>(params.get('acao') === 'novo' ? 'new' : null)
  const [selected, setSelected] = useState<string | null>(params.get('combo'))
  const [movement, setMovement] = useState<Combo | null>(null)
  const [archive, setArchive] = useState<Combo | null>(null)
  const combo = data && active(data.combos).find((c) => c.id === selected)
  return (
    <div className="stack-lg">
      <PageTitle
        label="Combos"
        title="Melhor quando vem junto."
        description="Agrupe produtos e movimente todos os componentes de uma só vez."
        action={<Button onClick={() => setEditor('new')}>Novo combo</Button>}
      />
      <DataBoundary loading={!data} error={error} retry={() => void reload()}>
        {data && (
          <>
            <SearchField
              label="Buscar combo"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {active(data.combos).length ? (
              <RecordList>
                {active(data.combos)
                  .filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
                  .map((c) => (
                    <RecordRow
                      key={c.id}
                      title={c.name}
                      detail={c.description}
                      value={brl(c.salePrice)}
                      actions={
                        <Button
                          variant="ghost"
                          onClick={() => setSelected(c.id)}
                          aria-label={`Ver combo ${c.name}`}
                        >
                          Ver combo
                        </Button>
                      }
                    />
                  ))}
              </RecordList>
            ) : (
              <EmptyState
                title="Crie seu primeiro combo"
                description="Cadastre os produtos e depois escolha a composição."
              />
            )}
            {selected && !combo && (
              <Alert tone="warning" title="Combo não encontrado">
                Esse QR pode pertencer a outra loja ou a um combo arquivado.
              </Alert>
            )}
            {editor && (
              <ComboEditor
                key={editor}
                combo={data.combos.find((c) => c.id === editor)}
                data={data}
                onClose={() => setEditor(null)}
              />
            )}
            {combo && (
              <ComboDetails
                combo={combo}
                data={data}
                onClose={() => setSelected(null)}
                onEdit={() => {
                  setSelected(null)
                  setEditor(combo.id)
                }}
                onMove={() => {
                  setSelected(null)
                  setMovement(combo)
                }}
                onArchive={() => {
                  setSelected(null)
                  setArchive(combo)
                }}
              />
            )}
            {movement && <ComboMovement combo={movement} onClose={() => setMovement(null)} />}
            {archive && (
              <ConfirmDialog
                open
                title="Arquivar combo?"
                description={archive.name}
                confirmLabel={busy ? 'Arquivando…' : 'Arquivar combo'}
                onClose={() => setArchive(null)}
                onConfirm={() => {
                  void run(() => operations!.archiveCombo(archive.id), 'Combo arquivado.').then(
                    () => setArchive(null),
                  )
                }}
              />
            )}
          </>
        )}
      </DataBoundary>
    </div>
  )
}
