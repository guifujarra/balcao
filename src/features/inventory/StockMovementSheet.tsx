import { type FormEvent } from 'react'
import type { Product } from '../../domain/model'
import { useAppServices } from '../../app/providers/services-context'
import { useMutation } from '../shared/useMutation'
import { BottomSheet } from '../../design-system/components/Overlay'
import { Input, Select } from '../../design-system/components/Fields'
import { Alert } from '../../design-system/components/Feedback'
import { SaveButton } from '../../design-system/components/Workspace'
import { decimal, units } from '../../application/services/presentation'
import { field } from '../../application/services/formInputs'
export function StockMovementSheet({
  product,
  initialType = 'IN',
  onClose,
}: {
  product: Product
  initialType?: string
  onClose: () => void
}) {
  const { operations } = useAppServices()
  const { busy, error, run } = useMutation()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const ok = await run(
      () =>
        operations!.registerMovement(
          product.id,
          field(form, 'type') as 'IN' | 'OUT' | 'ADJUSTMENT' | 'RETURN',
          decimal(field(form, 'quantity')),
          field(form, 'reason'),
        ),
      'Estoque atualizado e movimento registrado.',
    )
    if (ok) onClose()
  }
  return (
    <BottomSheet
      open
      onClose={busy ? () => undefined : onClose}
      title="Movimentar estoque"
      description={`${product.name} · Saldo: ${units(product.quantity)} ${product.unit}`}
    >
      <form className="stack" onSubmit={submit}>
        {error && (
          <Alert title="Movimento não registrado" tone="danger">
            {error}
          </Alert>
        )}
        <Select label="Tipo de movimento" name="type" defaultValue={initialType}>
          <option value="IN">Entrada</option>
          <option value="OUT">Saída</option>
          <option value="RETURN">Devolução ao estoque</option>
          <option value="ADJUSTMENT">Ajustar saldo contado</option>
        </Select>
        <Input
          label="Quantidade"
          name="quantity"
          inputMode="decimal"
          required
          hint="No ajuste, informe o saldo final contado. Nas outras operações, informe a quantidade movimentada."
        />
        <Input
          label="Motivo"
          name="reason"
          required
          maxLength={160}
          placeholder="Ex.: reposição, perda ou contagem"
        />
        <SaveButton busy={busy}>Registrar movimento</SaveButton>
      </form>
    </BottomSheet>
  )
}
