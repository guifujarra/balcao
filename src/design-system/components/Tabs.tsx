import { useId, type KeyboardEvent, type ReactNode } from 'react'

interface TabItem {
  value: string
  label: string
  content: ReactNode
}

export function Tabs({
  label,
  items,
  value,
  onChange,
}: {
  label: string
  items: TabItem[]
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  function handleKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    if (event.key === 'ArrowRight') next = (index + 1) % items.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    event.preventDefault()
    const item = items[next]
    if (item) {
      onChange(item.value)
      document.getElementById(`${id}-tab-${next}`)?.focus()
    }
  }
  return (
    <div className="tabs">
      <div className="tab-list" role="tablist" aria-label={label}>
        {items.map((item, index) => (
          <button
            key={item.value}
            id={`${id}-tab-${index}`}
            role="tab"
            type="button"
            tabIndex={value === item.value ? 0 : -1}
            aria-selected={value === item.value}
            aria-controls={`${id}-panel-${index}`}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => handleKey(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div
          key={item.value}
          hidden={value !== item.value}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}
