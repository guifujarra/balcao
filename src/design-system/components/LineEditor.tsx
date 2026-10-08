import { Button } from './Button'
import { Input, Select } from './Fields'
import { Plus, Trash2 } from '../icons'
export interface LineDraft {
  productId: string
  quantity: string
  unitCost: string
}
export function LineEditor({
  lines,
  products,
  onChange,
  costs = false,
}: {
  lines: LineDraft[]
  products: { id: string; name: string }[]
  onChange: (lines: LineDraft[]) => void
  costs?: boolean
}) {
  function change(index: number, patch: Partial<LineDraft>) {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }
  return (
    <div className="stack">
      {lines.map((line, index) => (
        <div className="stack composition-line" key={index}>
          <Select
            label={`Produto ${index + 1}`}
            value={line.productId}
            onChange={(e) => change(index, { productId: e.target.value })}
            required
          >
            <option value="">Selecione um produto</option>
            {products.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <div className="form-grid">
            <Input
              label={`Quantidade ${index + 1}`}
              inputMode="decimal"
              value={line.quantity}
              onChange={(e) => change(index, { quantity: e.target.value })}
              required
            />
            {costs && (
              <Input
                label={`Custo unitário ${index + 1} (R$)`}
                inputMode="decimal"
                value={line.unitCost}
                onChange={(e) => change(index, { unitCost: e.target.value })}
                required
              />
            )}
          </div>
          <Button variant="ghost" onClick={() => onChange(lines.filter((_, i) => i !== index))}>
            <Trash2 aria-hidden="true" /> Remover item {index + 1}
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        onClick={() => onChange([...lines, { productId: '', quantity: '1', unitCost: '0' }])}
      >
        <Plus aria-hidden="true" /> Adicionar produto à composição
      </Button>
    </div>
  )
}
