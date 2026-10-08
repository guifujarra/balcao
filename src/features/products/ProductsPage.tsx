import { StockMovementSheet } from '../inventory/StockMovementSheet'
import { dateTime, movementLabels, units } from '../../application/services/presentation'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { active, type Product, type StoreState } from '../../domain/model'
import { useAppServices } from '../../app/providers/services-context'
import { useStoreData } from '../shared/useStoreData'
import { useMutation } from '../shared/useMutation'
import { Button } from '../../design-system/components/Button'
import { Input, SearchField, Select } from '../../design-system/components/Fields'
import { Alert, Badge, EmptyState } from '../../design-system/components/Feedback'
import { Modal, ConfirmDialog, BottomSheet } from '../../design-system/components/Overlay'
import {
  DataBoundary,
  PageTitle,
  RecordList,
  RecordRow,
  SaveButton,
} from '../../design-system/components/Workspace'
import { Plus, ScanLine } from '../../design-system/icons'
import { brl, decimal, filterProducts, productView } from '../../application/services/presentation'
import { field, moneyInput, productInput } from '../../application/services/formInputs'

import { QrPanel } from '../shared/QrPanel'
import { productCode } from '../../domain/rules'

function ProductEditor({
  product,
  data,
  barcode,
  onClose,
  onSaved,
}: {
  product?: Product
  data: StoreState
  barcode: string
  onClose: () => void
  onSaved: (product: Product) => void
}) {
  const { operations } = useAppServices()
  const { busy, error, run } = useMutation()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    let saved: Product | undefined
    const ok = await run(
      async () => {
        if (!operations) throw new Error('Cadastro indisponível na demonstração.')
        const categoryName = field(form, 'newCategory')
        const categoryId = categoryName
          ? (await operations.saveCategory(categoryName)).id
          : field(form, 'categoryId')
        saved = await operations.saveProduct(
          productInput(form, categoryId),
          product?.id,
          product ? 0 : decimal(field(form, 'quantity') || '0'),
        )
      },
      product ? 'Produto atualizado.' : 'Produto cadastrado.',
    )
    if (ok && saved) onSaved(saved)
  }
  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={product ? 'Editar produto' : 'Novo produto'}
      description={
        product
          ? 'Atualize os dados do produto.'
          : barcode
            ? 'O código lido já está preenchido. Complete os dados do produto.'
            : 'Crie seu produto. O Balcão gera um QR code para usar nas vendas.'
      }
    >
      <form className="stack" onSubmit={submit}>
        {error && (
          <Alert tone="danger" title="Revise os dados">
            {error}
          </Alert>
        )}
        <div className="form-grid">
          <Input
            className="full-width"
            label="Nome do produto"
            name="name"
            required
            maxLength={160}
            defaultValue={product?.name}
            autoFocus
          />
          <Input
            label="Preço de venda (R$)"
            name="salePrice"
            inputMode="decimal"
            required
            defaultValue={moneyInput(product?.salePrice ?? 0)}
          />
          <Input
            label="Custo (R$)"
            name="costPrice"
            inputMode="decimal"
            defaultValue={moneyInput(product?.costPrice ?? 0)}
          />
          <Input
            label="Código de barras"
            name="barcode"
            maxLength={100}
            defaultValue={product?.barcode ?? barcode}
            hint="Opcional. O produto também terá seu próprio QR code."
          />
          <Input label="SKU" name="sku" maxLength={60} defaultValue={product?.sku} />
          <Select label="Unidade" name="unit" defaultValue={product?.unit ?? 'un'}>
            <option value="un">Unidade</option>
            <option value="kg">Quilograma</option>
            <option value="l">Litro</option>
            <option value="m">Metro</option>
          </Select>
          <Input
            label="Estoque mínimo"
            name="minimumStock"
            inputMode="decimal"
            defaultValue={product?.minimumStock ?? 0}
          />
          {!product && (
            <Input
              label="Estoque inicial"
              name="quantity"
              inputMode="decimal"
              defaultValue="0"
              hint="Será registrado no histórico como entrada."
            />
          )}
          <Input
            label="Validade"
            name="expirationDate"
            type="date"
            defaultValue={product?.expirationDate}
          />
          <Select label="Categoria" name="categoryId" defaultValue={product?.categoryId ?? ''}>
            <option value="">Sem categoria</option>
            {active(data.categories).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            label="Ou criar categoria"
            name="newCategory"
            maxLength={60}
            placeholder="Nome da nova categoria"
          />
        </div>
        <div className="form-actions">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Voltar
          </Button>
          <SaveButton busy={busy}>Salvar produto</SaveButton>
        </div>
      </form>
    </Modal>
  )
}
export function ProductsPage() {
  const { operations, data, error, busy, run, reload } = useStoreData()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(params.get('filtro') ?? '')
  const [category, setCategory] = useState('')
  const [entry, setEntry] = useState(params.get('acao') === 'novo' && !params.get('barcode'))
  const [editor, setEditor] = useState<string | null>(
    params.get('acao') === 'codigo' || (params.get('acao') === 'novo' && params.get('barcode'))
      ? 'new-code'
      : null,
  )
  function closeCreation() {
    setEntry(false)
    setEditor(null)
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('acao')
        next.delete('barcode')
        next.delete('retorno')
        return next
      },
      { replace: true },
    )
  }
  const [selected, setSelected] = useState<string | null>(
    params.get('movimento') ? null : params.get('produto'),
  )
  const [movement, setMovement] = useState<{ id: string; type: string } | null>(
    params.get('movimento')
      ? { id: params.get('produto') ?? '', type: params.get('movimento') ?? 'IN' }
      : null,
  )
  const [archive, setArchive] = useState<Product | null>(null)
  const product = data?.products.find((p) => p.id === selected && !p.deletedAt)
  return (
    <div className="stack-lg">
      <PageTitle
        label="Estoque"
        title="Cada produto, no seu lugar."
        description="Seu catálogo e os saldos da loja, sempre à mão."
        action={
          <Button onClick={() => setEntry(true)}>
            <Plus aria-hidden="true" /> Novo produto
          </Button>
        }
      />
      <DataBoundary loading={!data} error={error} retry={() => void reload()}>
        {data && (
          <>
            <div className="toolbar">
              <SearchField
                label="Buscar produto"
                placeholder="Nome, SKU ou código de barras"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Select label="Situação" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="">Todos os produtos</option>
                <option value="baixo">Estoque baixo</option>
                <option value="zerado">Sem estoque</option>
                <option value="validade">Vencidos e próximos de vencer</option>
              </Select>
              <Select
                label="Filtrar categoria"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Todas as categorias</option>
                {active(data.categories).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            {filterProducts(data, query, filter, category).length ? (
              <RecordList>
                {filterProducts(data, query, filter, category).map((p) => {
                  const view = productView(p, data)
                  return (
                    <RecordRow
                      key={p.id}
                      title={p.name}
                      detail={
                        <>
                          {view.category} · {view.sku}
                          <br />
                          <Badge tone={view.tone}>{view.status}</Badge> · {view.stock}
                        </>
                      }
                      value={view.price}
                      actions={
                        <Button
                          variant="ghost"
                          onClick={() => setSelected(p.id)}
                          aria-label={`Ver ${p.name}`}
                        >
                          Ver produto
                        </Button>
                      }
                    />
                  )
                })}
              </RecordList>
            ) : (
              <EmptyState
                title={
                  active(data.products).length
                    ? 'Nenhum produto encontrado'
                    : 'Seu estoque começa aqui'
                }
                description={
                  active(data.products).length
                    ? 'Tente outro termo ou filtro.'
                    : 'Cadastre o primeiro produto para começar a controlar sua loja.'
                }
                action={<Button onClick={() => setEntry(true)}>Cadastrar produto</Button>}
              />
            )}
            {entry && (
              <BottomSheet
                open
                title="Adicionar produto"
                description="Como você quer cadastrar o produto?"
                onClose={closeCreation}
              >
                <div className="stack">
                  <Button onClick={() => navigate('/escanear?modo=cadastro&auto=1')}>
                    <ScanLine aria-hidden="true" /> Ler código de barras
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEntry(false)
                      setEditor('new-custom')
                    }}
                  >
                    <Plus aria-hidden="true" /> Criar produto customizado
                  </Button>
                  <p className="muted text-small">
                    O produto customizado recebe um QR code que você pode compartilhar e imprimir.
                  </p>
                </div>
              </BottomSheet>
            )}
            {editor && (
              <ProductEditor
                key={editor}
                product={data.products.find((p) => p.id === editor)}
                data={data}
                barcode={params.get('barcode') ?? ''}
                onClose={closeCreation}
                onSaved={(saved) => {
                  const custom = editor === 'new-custom'
                  const returnToSale = params.get('retorno') === 'venda'
                  closeCreation()
                  if (returnToSale) navigate('/escanear?modo=venda&auto=1')
                  else if (custom) setSelected(saved.id)
                }}
              />
            )}
            {movement && data.products.find((p) => p.id === movement.id) && (
              <StockMovementSheet
                product={data.products.find((p) => p.id === movement.id)!}
                initialType={movement.type}
                onClose={() => setMovement(null)}
              />
            )}
            {product && (
              <Modal open title={product.name} onClose={() => setSelected(null)}>
                <div className="stack">
                  <dl className="detail-grid">
                    <div>
                      <dt>Saldo atual</dt>
                      <dd>{productView(product, data).stock}</dd>
                    </div>
                    <div>
                      <dt>Preço</dt>
                      <dd>{brl(product.salePrice)}</dd>
                    </div>
                    <div>
                      <dt>Custo</dt>
                      <dd>{brl(product.costPrice)}</dd>
                    </div>
                    <div>
                      <dt>SKU / código</dt>
                      <dd>
                        {product.sku || '—'} / {product.barcode || '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Estoque mínimo</dt>
                      <dd>
                        {product.minimumStock} {product.unit}
                      </dd>
                    </div>
                    <div>
                      <dt>Validade</dt>
                      <dd>{product.expirationDate || 'Não informada'}</dd>
                    </div>
                  </dl>
                  <div className="form-actions">
                    <Button
                      onClick={() => {
                        setSelected(null)
                        setMovement({ id: product.id, type: 'IN' })
                      }}
                    >
                      Movimentar estoque
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelected(null)
                        setEditor(product.id)
                      }}
                    >
                      Editar produto
                    </Button>
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={() => {
                        setSelected(null)
                        setArchive(product)
                      }}
                    >
                      Arquivar
                    </Button>
                  </div>
                  <QrPanel value={productCode(product.id)} name={product.name} kind="produto" />
                  <section className="stack">
                    <h3>Histórico do estoque</h3>
                    {data.inventory_movements.filter((m) => m.productId === product.id).length ? (
                      <RecordList>
                        {data.inventory_movements
                          .filter((m) => m.productId === product.id)
                          .slice()
                          .reverse()
                          .map((m) => (
                            <RecordRow
                              key={m.id}
                              title={movementLabels[m.type]}
                              detail={
                                <>
                                  {m.reason}
                                  <br />
                                  {dateTime(m.createdAt)} · Saldo: {units(m.previousQuantity)} →{' '}
                                  {units(m.currentQuantity)}
                                </>
                              }
                              value={`${m.quantityDelta > 0 ? '+' : ''}${units(m.quantityDelta)} ${product.unit}`}
                            />
                          ))}
                      </RecordList>
                    ) : (
                      <p className="muted">Nenhuma movimentação registrada.</p>
                    )}
                  </section>
                </div>
              </Modal>
            )}
            {archive && (
              <ConfirmDialog
                open
                title="Arquivar produto?"
                description={`O produto ${archive.name} sairá do catálogo ativo. O histórico será preservado. O saldo deve ser zero.`}
                confirmLabel="Arquivar produto"
                onClose={() => setArchive(null)}
                onConfirm={() => {
                  void run(() => operations!.archiveProduct(archive.id), 'Produto arquivado.').then(
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
