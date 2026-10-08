import { useEffect, useState } from 'react'
import { useAppServices } from '../../app/providers/services-context'
import { useToast } from '../../app/providers/toast-context'
import { Button } from '../../design-system/components/Button'
import { Alert, LoadingState } from '../../design-system/components/Feedback'

export function QrPanel({
  value,
  name,
  kind,
}: {
  value: string
  name: string
  kind: 'produto' | 'combo'
}) {
  const { qr, files } = useAppServices()
  const { notify } = useToast()
  const [image, setImage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let alive = true
    void qr?.(value, name).then(
      (png) => {
        if (alive) setImage(png)
      },
      () => {
        if (alive) setError('Não foi possível gerar o QR code.')
      },
    )
    return () => {
      alive = false
    }
  }, [qr, value, name])
  async function exportImage(download = false) {
    if (!files || busy) return
    setBusy(true)
    setError('')
    const filename = 'balcao-' + kind + '-' + value.split(':').at(-1) + '.png'
    try {
      if (download && files.downloadImage) {
        await files.downloadImage(filename, image)
        notify('Imagem do QR code baixada.')
      } else {
        const result = await files.shareImage(filename, image, name)
        if (result === 'downloaded') notify('Imagem baixada. Você pode enviá-la para imprimir.')
      }
    } catch {
      setError('Não foi possível exportar a imagem. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="qr-panel stack" aria-label={`QR code do ${kind}`}>
      <h3>QR code do {kind}</h3>
      {image ? (
        <img src={image} className="qr-image" alt={`QR do ${kind} ${name}`} />
      ) : (
        !error && <LoadingState label="Gerando QR code…" />
      )}
      <p className="muted text-small">Compartilhe a imagem para imprimir e ler no Balcão.</p>
      {error && (
        <Alert tone="warning" title="Imagem indisponível">
          {error}
        </Alert>
      )}
      <div className="form-actions">
        <Button
          variant="secondary"
          disabled={!image || busy || !files}
          onClick={() => void exportImage()}
        >
          Compartilhar QR code
        </Button>
        {files?.downloadImage && (
          <Button variant="ghost" disabled={!image || busy} onClick={() => void exportImage(true)}>
            Baixar PNG
          </Button>
        )}
      </div>
    </section>
  )
}
