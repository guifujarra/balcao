import { Link } from 'react-router'
import { moreNavigation } from '../../app/navigation/items'
import { ArrowRight, ChevronRight, Palette } from '../../design-system/icons'

export function MorePage() {
  return (
    <div className="stack-lg">
      <header className="page-heading">
        <p className="eyebrow muted">Sua loja por inteiro</p>
        <h1>Um espaço para cada coisa.</h1>
        <p>Encontre as outras ferramentas do seu dia a dia.</p>
      </header>
      <div className="module-grid">
        {moreNavigation.map(({ path, label, description, icon: Icon }) => (
          <Link to={path} key={path} className="module-link surface">
            <span className="module-icon">
              <Icon aria-hidden="true" />
            </span>
            <div>
              <h2>{label}</h2>
              <p>{description}</p>
            </div>
            <ChevronRight aria-hidden="true" />
          </Link>
        ))}
      </div>
      <Link className="kit-promo" to="/dev/ui-kit">
        <Palette aria-hidden="true" />
        <div>
          <strong>Uma interface que fala a mesma língua.</strong>
          <p>Explore os componentes e seus estados no UI Kit.</p>
        </div>
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  )
}
