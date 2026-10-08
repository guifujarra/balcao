import {
  Banknote,
  Ellipsis,
  House,
  Layers3,
  Package,
  ReceiptText,
  Settings2,
  ShoppingBag,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from '../../design-system/icons'

export interface NavigationItem {
  path: string
  label: string
  icon: LucideIcon
  description: string
}
export const mainNavigation: NavigationItem[] = [
  { path: '/', label: 'Início', icon: House, description: 'Sua loja em um só lugar' },
  { path: '/estoque', label: 'Estoque', icon: Package, description: 'Produtos e movimentações' },
  { path: '/vendas', label: 'Vendas', icon: ReceiptText, description: 'Do carrinho ao pagamento' },
  { path: '/mais', label: 'Mais', icon: Ellipsis, description: 'Outras ferramentas da loja' },
]
export const moreNavigation: NavigationItem[] = [
  { path: '/combos', label: 'Combos', icon: Layers3, description: 'Produtos que funcionam juntos' },
  {
    path: '/compras',
    label: 'Compras',
    icon: ShoppingBag,
    description: 'Reposição bem organizada',
  },
  { path: '/clientes', label: 'Clientes', icon: Users, description: 'Quem compra com você' },
  {
    path: '/fornecedores',
    label: 'Fornecedores',
    icon: Truck,
    description: 'Os parceiros da sua loja',
  },
  {
    path: '/financeiro',
    label: 'Financeiro',
    icon: Wallet,
    description: 'Entradas, despesas e caixa',
  },
  {
    path: '/relatorios',
    label: 'Relatórios',
    icon: Banknote,
    description: 'Informações para decidir melhor',
  },
  {
    path: '/configuracoes',
    label: 'Configurações',
    icon: Settings2,
    description: 'Deixe o Balcão do seu jeito',
  },
]

export function getRouteTitle(path: string) {
  return (
    [...mainNavigation, ...moreNavigation].find((item) => item.path === path)?.label ??
    (path === '/escanear'
      ? 'Leitura de código'
      : path === '/dev/ui-kit'
        ? 'UI Kit'
        : 'Página não encontrada')
  )
}
