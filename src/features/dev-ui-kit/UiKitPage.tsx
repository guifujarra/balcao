import { RecordList, RecordRow } from '../../design-system/components/Workspace'
import { LineEditor, type LineDraft } from '../../design-system/components/LineEditor'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useToast } from '../../app/providers/toast-context'
import { Button, IconButton } from '../../design-system/components/Button'
import { Input, NumberField, SearchField, Select } from '../../design-system/components/Fields'
import {
  Alert,
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
} from '../../design-system/components/Feedback'
import { ProductCard, ProductRow, StatCard } from '../../design-system/components/DataDisplay'
import { BottomSheet, ConfirmDialog, Modal } from '../../design-system/components/Overlay'
import { ScannerOverlay } from '../../design-system/components/ScannerOverlay'
import { Tabs } from '../../design-system/components/Tabs'
import { ActionTile, StatusTile } from '../../design-system/components/DashboardTiles'
import { Link } from 'react-router'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Package,
  Plus,
  ScanLine,
  Settings2,
  ShoppingBasket,
  Trash2,
} from '../../design-system/icons'

function KitSection({
  title,
  caption,
  children,
}: {
  title: string
  caption: string
  children: ReactNode
}) {
  return (
    <section className="kit-section">
      <div className="kit-section-header">
        <h2>{title}</h2>
        <span>{caption}</span>
      </div>
      {children}
    </section>
  )
}

type Overlay = 'modal' | 'sheet' | 'confirm' | 'scanner' | null

export default function UiKitPage() {
  const { notify } = useToast()
  const [exampleLines, setExampleLines] = useState<LineDraft[]>([
    { productId: 'example', quantity: '1', unitCost: '0' },
  ])
  const [activeTab, setActiveTab] = useState('components')
  const [stateTab, setStateTab] = useState('empty')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [exampleName, setExampleName] = useState('Café especial')
  const [scannerDenied, setScannerDenied] = useState(false)
  const [manualEntry, setManualEntry] = useState(false)
  const [code, setCode] = useState('')
  const [codeSubmitted, setCodeSubmitted] = useState(false)
  const close = () => setOverlay(null)
  function submitExample(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (name.trim()) notify('Exemplo validado. Nenhum produto foi cadastrado.')
  }
  function openScanner() {
    setManualEntry(false)
    setCodeSubmitted(false)
    setOverlay('scanner')
  }
  // Fixtures de apresentação restritas ao UI Kit. Não são entidades ou dados operacionais.
  const product = {
    name: 'Café especial',
    detail: 'Mercearia · Pacote de 250 g',
    priceLabel: 'R$ 18,90',
    quantityLabel: '24 unidades',
    status: { label: 'Em estoque', tone: 'success' as const },
  }
  const matchesSearch = product.name
    .toLocaleLowerCase('pt-BR')
    .includes(search.toLocaleLowerCase('pt-BR'))
  const components = (
    <div className="kit-grid">
      <div className="stack-lg">
        <KitSection title="Registros e composição" caption="RecordList · RecordRow · LineEditor">
          <div className="stack">
            <RecordList>
              <RecordRow
                title="Exemplo de registro"
                detail="Descrição e contexto da operação"
                value="R$ 18,90"
                actions={
                  <Button variant="ghost" onClick={() => notify('Ação de exemplo.')}>
                    Detalhes
                  </Button>
                }
              />
            </RecordList>
            <LineEditor
              lines={exampleLines}
              onChange={setExampleLines}
              products={[{ id: 'example', name: 'Produto de exemplo' }]}
            />
          </div>
        </KitSection>
        <KitSection title="Atalhos e alertas" caption="ActionTile · StatusTile">
          <div className="kit-two-fields">
            <ActionTile
              label="Escanear"
              description="Encontre pelo código"
              icon={<ScanLine />}
              prominent
              onClick={() => notify('Atalho de exemplo selecionado.')}
            />
            <StatusTile
              label="Estoque baixo"
              value="7"
              detail="Produtos para repor"
              icon={<Package />}
              tone="warning"
              onClick={() => notify('Alerta de exemplo selecionado.')}
            />
          </div>
        </KitSection>
        <KitSection title="Ações" caption="Button · IconButton">
          <div className="surface kit-panel stack">
            <span className="kit-label">Uma ação principal por contexto</span>
            <div className="row">
              <Button
                icon={<Plus aria-hidden="true" />}
                onClick={() => notify('Ação de exemplo concluída.')}
              >
                Adicionar produto
              </Button>
              <Button variant="secondary" onClick={() => notify('Ação secundária selecionada.')}>
                Ver detalhes
              </Button>
            </div>
            <div className="row">
              <Button
                variant="ghost"
                icon={<ArrowRight aria-hidden="true" />}
                onClick={() => notify('Ação discreta selecionada.')}
              >
                Continuar
              </Button>
              <IconButton
                label="Ajustar exemplo"
                variant="secondary"
                onClick={() => setOverlay('sheet')}
              >
                <Settings2 aria-hidden="true" />
              </IconButton>
              <IconButton
                label="Remover exemplo"
                variant="danger"
                onClick={() => setOverlay('confirm')}
              >
                <Trash2 aria-hidden="true" />
              </IconButton>
            </div>
            <span className="kit-label">Carregando e indisponível</span>
            <div className="row">
              <Button loading>Salvando</Button>
              <Button disabled variant="secondary">
                Indisponível
              </Button>
            </div>
          </div>
        </KitSection>
        <KitSection title="Produtos" caption="ProductRow · ProductCard">
          <SearchField
            label="Buscar no exemplo"
            placeholder="Experimente “café”"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="surface kit-list">
            {matchesSearch ? (
              <ProductRow product={product} onClick={() => setOverlay('modal')} />
            ) : (
              <EmptyState
                title="Nenhum resultado no exemplo"
                description="Tente buscar por café ou limpe a pesquisa."
                action={
                  <Button variant="ghost" onClick={() => setSearch('')}>
                    Limpar pesquisa
                  </Button>
                }
              />
            )}
          </div>
          <ProductCard
            product={product}
            action={
              <Button
                variant="secondary"
                icon={<Plus aria-hidden="true" />}
                onClick={() => notify('Item de exemplo selecionado.')}
              >
                Selecionar exemplo
              </Button>
            }
          />
        </KitSection>
        <KitSection title="Indicadores" caption="StatCard">
          <StatCard
            label="Vendas de hoje"
            value="R$ 248,50"
            detail="Valor ilustrativo para o UI Kit"
            icon={<ShoppingBasket />}
          />
        </KitSection>
      </div>
      <div className="stack-lg">
        <KitSection title="Entradas" caption="Input · Select · NumberField">
          <form className="kit-form surface kit-panel" noValidate onSubmit={submitExample}>
            <Input
              label="Nome do produto"
              placeholder="Ex.: Café especial"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              error={
                submitted && !name.trim() ? 'Informe um nome para validar o exemplo.' : undefined
              }
              hint="Dê um nome fácil de encontrar."
            />
            <div className="kit-two-fields">
              <Input label="SKU" placeholder="CAF-001" />
              <NumberField label="Quantidade" min={0} step={1} defaultValue={12} />
            </div>
            <Select label="Categoria" defaultValue="mercearia">
              <option value="mercearia">Mercearia</option>
              <option value="bebidas">Bebidas</option>
              <option value="limpeza">Limpeza</option>
            </Select>
            <Input
              label="Campo com erro"
              defaultValue="12A"
              error="Exemplo de orientação para corrigir um campo."
            />
            <Input
              label="Campo desabilitado"
              disabled
              value="Indisponível neste exemplo"
              readOnly
            />
            <Button type="submit" icon={<Check aria-hidden="true" />}>
              Validar exemplo
            </Button>
            <p className="kit-label">Demonstração de formulário. Os dados não são salvos.</p>
          </form>
        </KitSection>
        <KitSection title="Sobreposições" caption="Modal · BottomSheet">
          <div className="surface kit-panel stack">
            <p className="muted">Contexto preservado, foco na tarefa.</p>
            <Button variant="secondary" onClick={() => setOverlay('modal')}>
              Abrir modal
            </Button>
            <Button variant="secondary" onClick={() => setOverlay('sheet')}>
              Abrir ações rápidas
            </Button>
            <Button variant="danger" onClick={() => setOverlay('confirm')}>
              Testar confirmação
            </Button>
          </div>
        </KitSection>
        <KitSection title="Leitura de códigos" caption="ScannerOverlay">
          <div className="surface kit-panel stack">
            <span className="shortcut-icon">
              <ScanLine aria-hidden="true" />
            </span>
            <p className="muted">
              Enquadramento, permissão indisponível e entrada manual em um só padrão visual.
            </p>
            <Button variant="secondary" onClick={openScanner}>
              Visualizar scanner
            </Button>
            <p className="kit-label">A câmera não é acionada nesta demonstração.</p>
          </div>
        </KitSection>
      </div>
    </div>
  )
  const feedback = (
    <div className="kit-grid">
      <div className="stack-lg">
        <KitSection title="Mensagens claras" caption="Alert">
          <Alert tone="success" title="Tudo certo por aqui">
            Exemplo de feedback após uma ação concluída.
          </Alert>
          <Alert tone="warning" title="Um detalhe precisa de atenção">
            Explique o contexto e o próximo passo.
          </Alert>
          <Alert tone="danger" title="Não foi possível concluir">
            Preserve os dados digitados para uma nova tentativa.
          </Alert>
          <Alert tone="info" title="Uma informação útil">
            Mensagens curtas, no momento certo.
          </Alert>
        </KitSection>
        <KitSection title="Identificação" caption="Badge">
          <div className="row">
            <Badge>Neutro</Badge>
            <Badge tone="success">Em estoque</Badge>
            <Badge tone="warning">Estoque baixo</Badge>
            <Badge tone="danger">Sem estoque</Badge>
            <Badge tone="info">Informação</Badge>
          </div>
        </KitSection>
        <KitSection title="Feedback imediato" caption="Toast">
          <div className="row">
            <Button
              icon={<CheckCircle2 aria-hidden="true" />}
              onClick={() => notify('Exemplo concluído com sucesso.')}
            >
              Mostrar sucesso
            </Button>
            <Button
              variant="secondary"
              onClick={() => notify('Não foi possível concluir o exemplo.', 'error')}
            >
              Mostrar erro
            </Button>
          </div>
          <Button
            variant="secondary"
            onClick={() => notify('Café adicionado à venda. Exemplo.', 'success', 1800, true)}
          >
            Testar aviso breve da leitura
          </Button>
        </KitSection>
      </div>
      <KitSection title="Cada momento tem seu estado" caption="Tabs">
        <div className="surface kit-panel kit-state-panel">
          <Tabs
            label="Estados de carregamento"
            value={stateTab}
            onChange={setStateTab}
            items={[
              {
                value: 'empty',
                label: 'Vazio',
                content: (
                  <EmptyState
                    title="Um novo começo"
                    description="Quando ainda não há produtos, mostre como dar o primeiro passo."
                    action={
                      <Button
                        variant="secondary"
                        onClick={() => notify('Ação do estado vazio selecionada.')}
                      >
                        Começar
                      </Button>
                    }
                  />
                ),
              },
              {
                value: 'loading',
                label: 'Carregando',
                content: <LoadingState label="Buscando as informações…" />,
              },
              {
                value: 'error',
                label: 'Erro',
                content: (
                  <ErrorState
                    description="Este é um erro simulado para revisar a interface."
                    onRetry={() => {
                      setStateTab('success')
                      notify('Nova tentativa concluída no exemplo.')
                    }}
                  />
                ),
              },
              {
                value: 'success',
                label: 'Sucesso',
                content: (
                  <EmptyState
                    title="Pronto para continuar"
                    description="Confirme o resultado de cada ação com clareza."
                    icon={<CheckCircle2 />}
                  />
                ),
              },
            ]}
          />
        </div>
      </KitSection>
    </div>
  )
  const foundations = (
    <div className="kit-grid">
      <div className="stack-lg">
        <KitSection title="Paleta" caption="Cores semânticas">
          <div className="swatch-grid">
            {[
              { key: 'primary', label: 'Ação' },
              { key: 'canvas', label: 'Fundo' },
              { key: 'accent', label: 'Destaque' },
              { key: 'success', label: 'Sucesso' },
              { key: 'warning', label: 'Atenção' },
              { key: 'danger', label: 'Erro' },
            ].map((swatch) => (
              <div className="swatch" key={swatch.key}>
                <span className={`swatch-${swatch.key}`} />
                <strong>{swatch.label}</strong>
              </div>
            ))}
          </div>
        </KitSection>
        <KitSection title="Respiro" caption="Escala de espaçamento">
          <div className="spacing-scale">
            {[4, 8, 12, 16, 24, 32, 48].map((size) => (
              <div key={size}>
                <span className={`space-sample-${size}`} />
                {size}px
              </div>
            ))}
          </div>
        </KitSection>
        <KitSection title="Forma" caption="Raios consistentes">
          <div className="radius-samples">
            <span>8px</span>
            <span>10px</span>
            <span>12px</span>
          </div>
        </KitSection>
      </div>
      <div className="stack-lg">
        <KitSection title="Uma voz, em cada tela" caption="Manrope">
          <p className="type-sample-large">
            Simples de usar.
            <br />
            Fácil de entender.
          </p>
          <h3>Hierarquia que orienta.</h3>
          <p>Textos legíveis, instruções diretas e espaço para o conteúdo respirar.</p>
          <p className="eyebrow muted">Detalhes que fazem diferença</p>
        </KitSection>
        <KitSection title="Ícones" caption="Lucide">
          <div className="row" aria-label="Exemplos de ícones">
            <Package aria-label="Produto" />
            <ScanLine aria-label="Scanner" />
            <ShoppingBasket aria-label="Venda" />
            <Settings2 aria-label="Configurações" />
            <CheckCircle2 aria-label="Sucesso" />
          </div>
        </KitSection>
        <Alert tone="info" title="Acessibilidade desde a base">
          Navegação por teclado, foco visível, rótulos explícitos, áreas de toque confortáveis e
          respeito à preferência por menos movimento.
        </Alert>
      </div>
    </div>
  )
  return (
    <div className="stack-lg">
      <header className="kit-heading">
        <div className="page-heading">
          <p className="eyebrow muted">Balcão · Sistema de interface</p>
          <h1>Consistência em cada detalhe.</h1>
          <p>Componentes de verdade. Um mesmo cuidado em todas as telas.</p>
        </div>
        <Badge tone="success">UI Kit · v0.1</Badge>
      </header>
      <Alert tone="info" title="Um espaço para experimentar">
        Todos os valores e ações abaixo são exemplos visuais.
      </Alert>
      <section className="home-preview-links" aria-label="Prévia dos estados da Home">
        <span className="kit-label">Conferir a Home:</span>
        {[
          { value: 'ready', label: 'Preenchida' },
          { value: 'empty', label: 'Vazia' },
          { value: 'loading', label: 'Carregando' },
          { value: 'retry', label: 'Erro e recuperação' },
        ].map((item) => (
          <Link
            key={item.value}
            reloadDocument
            className="text-link"
            to={`/?preview=${item.value}`}
          >
            {item.label}
          </Link>
        ))}
      </section>
      <Tabs
        label="Seções do UI Kit"
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { value: 'components', label: 'Componentes', content: components },
          { value: 'feedback', label: 'Estados e feedback', content: feedback },
          { value: 'foundations', label: 'Fundamentos', content: foundations },
        ]}
      />
      <Modal
        open={overlay === 'modal'}
        onClose={close}
        title="Editar exemplo"
        description="Uma ação curta, sem sair de contexto."
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button
              disabled={!exampleName.trim()}
              onClick={() => {
                close()
                notify('Exemplo atualizado apenas nesta prévia.')
              }}
            >
              Aplicar exemplo
            </Button>
          </>
        }
      >
        <Input
          label="Nome de exemplo"
          value={exampleName}
          onChange={(event) => setExampleName(event.target.value)}
        />
        <p className="kit-label">Demonstração visual. Nenhum cadastro será alterado.</p>
      </Modal>
      <BottomSheet
        open={overlay === 'sheet'}
        onClose={close}
        title="O que você quer fazer?"
        description="Ações rápidas sempre por perto."
      >
        <div className="stack">
          <Button
            fullWidth
            icon={<Plus aria-hidden="true" />}
            onClick={() => {
              close()
              notify('Entrada selecionada no exemplo.')
            }}
          >
            Exemplo de entrada
          </Button>
          <Button
            fullWidth
            variant="secondary"
            icon={<Package aria-hidden="true" />}
            onClick={() => {
              close()
              notify('Detalhes selecionados no exemplo.')
            }}
          >
            Exemplo de detalhes
          </Button>
          <Button fullWidth variant="ghost" onClick={close}>
            Voltar
          </Button>
        </div>
      </BottomSheet>
      <ConfirmDialog
        open={overlay === 'confirm'}
        onClose={close}
        title="Remover este exemplo?"
        description="Esta confirmação é apenas uma demonstração do componente."
        confirmLabel="Confirmar exemplo"
        onConfirm={() => {
          close()
          notify('Ação de exemplo confirmada.')
        }}
      />
      <Modal
        open={overlay === 'scanner'}
        onClose={close}
        title={manualEntry ? 'Digitar código de exemplo' : 'Prévia do scanner'}
        description="Demonstração visual, sem acesso à câmera."
      >
        {manualEntry ? (
          <form
            className="stack"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              setCodeSubmitted(true)
              if (code.trim()) {
                close()
                notify('Código de exemplo recebido. Nenhuma consulta foi feita.')
              }
            }}
          >
            <Input
              label="Código de barras ou QR"
              autoComplete="off"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              error={
                codeSubmitted && !code.trim() ? 'Digite um código para testar o campo.' : undefined
              }
            />
            <Button type="submit">Confirmar código de exemplo</Button>
            <Button variant="ghost" onClick={() => setManualEntry(false)}>
              Voltar à prévia
            </Button>
          </form>
        ) : (
          <div className="stack">
            <ScannerOverlay
              state={scannerDenied ? 'denied' : 'ready'}
              onManualEntry={() => setManualEntry(true)}
            />
            <Button variant="ghost" onClick={() => setScannerDenied((current) => !current)}>
              {scannerDenied ? 'Simular câmera disponível' : 'Simular câmera indisponível'}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
