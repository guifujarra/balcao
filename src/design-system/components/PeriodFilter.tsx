import { Input } from './Fields'
export function PeriodFilter({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string
  to: string
  onFrom: (value: string) => void
  onTo: (value: string) => void
}) {
  return (
    <div className="toolbar">
      <Input
        label="Data inicial"
        type="date"
        value={from}
        onChange={(e) => onFrom(e.target.value)}
      />
      <Input label="Data final" type="date" value={to} onChange={(e) => onTo(e.target.value)} />
    </div>
  )
}
