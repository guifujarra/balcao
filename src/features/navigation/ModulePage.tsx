import { Link } from 'react-router'
import type { NavigationItem } from '../../app/navigation/items'
import { ArrowLeft, ArrowRight } from '../../design-system/icons'
import { Badge, EmptyState } from '../../design-system/components/Feedback'

const moduleCopy: Record<string, { title: string; description: string }> = {
  '/estoque': {
    title: 'Cada produto, no seu lugar.',
    description:
      'Aqui você vai cadastrar produtos, acompanhar quantidades e consultar cada movimentação.',
  },
  '/escanear': {
    title: 'Um código. Menos passos.',
    description:
      'Este será o atalho para encontrar produtos e combos usando a câmera ou digitando um código.',
  },
  '/vendas': {
    title: 'Do carrinho ao “volte sempre”.',
    description:
      'Aqui você vai montar o carrinho, escolher a forma de pagamento e acompanhar suas vendas.',
  },
  '/combos': {
    title: 'Melhor quando vem junto.',
    description:
      'Aqui você vai combinar produtos, gerar um QR Code e movimentar os itens de uma só vez.',
  },
}

export function ModulePage({ item }: { item: NavigationItem }) {
  const copy = moduleCopy[item.path] ?? {
    title: `${item.label}, com simplicidade.`,
    description: item.description + '. Este espaço vai reunir as informações da sua loja.',
  }
  const Icon = item.icon
  return (
    <div className="stack-lg">
      <header className="page-heading">
        <p className="eyebrow muted">{item.label}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </header>
      <section className="module-placeholder surface">
        <div className="row">
          <Badge tone="info">Em preparação</Badge>
        </div>
        <EmptyState
          icon={<Icon />}
          title="Seu próximo espaço de trabalho"
          description="Esta área faz parte da prévia. As operações serão liberadas nas próximas etapas."
          action={
            <Link className="button button--primary" to="/">
              Voltar ao início <ArrowRight aria-hidden="true" />
            </Link>
          }
        />
      </section>
      <Link to="/mais" className="text-link">
        <ArrowLeft aria-hidden="true" /> Explorar outros módulos
      </Link>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <section className="stack-lg">
      <header className="page-heading">
        <p className="eyebrow muted">Página não encontrada</p>
        <h1>Vamos voltar ao balcão?</h1>
        <p>Este endereço não está disponível.</p>
      </header>
      <div>
        <Link to="/" className="button button--primary">
          <ArrowLeft aria-hidden="true" /> Voltar ao início
        </Link>
      </div>
    </section>
  )
}
