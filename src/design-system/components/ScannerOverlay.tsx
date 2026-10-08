import { ScanLine, TriangleAlert } from '../icons'
import { Button } from './Button'

export function ScannerOverlay({
  state = 'ready',
  onManualEntry,
}: {
  state?: 'ready' | 'denied'
  onManualEntry: () => void
}) {
  return (
    <section className="scanner-overlay" aria-label="Área de leitura de códigos">
      <div className="scanner-frame" aria-hidden="true">
        {state === 'denied' ? <TriangleAlert /> : <ScanLine />}
      </div>
      <div className="stack">
        <h3>{state === 'denied' ? 'Câmera indisponível' : 'Posicione o código aqui'}</h3>
        <p>
          {state === 'denied'
            ? 'Você também pode informar o código manualmente.'
            : 'Alinhe o código de barras ou QR Code dentro da área.'}
        </p>
        <Button variant="secondary" onClick={onManualEntry}>
          Digitar código
        </Button>
      </div>
    </section>
  )
}
