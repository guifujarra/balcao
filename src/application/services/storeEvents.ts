const listeners = new Set<() => void>()
export function onStoreChange(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function emitStoreChange() {
  for (const listener of listeners) listener()
}
