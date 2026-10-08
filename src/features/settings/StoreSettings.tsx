import { useState, type FormEvent } from 'react'
import { useAppServices } from '../../app/providers/services-context'
import { useStoreData } from '../shared/useStoreData'
import { useMutation } from '../shared/useMutation'
import { Button } from '../../design-system/components/Button'
import { Input } from '../../design-system/components/Fields'
import { Alert } from '../../design-system/components/Feedback'
import { ConfirmDialog } from '../../design-system/components/Overlay'
import { SaveButton } from '../../design-system/components/Workspace'
import { field } from '../../application/services/formInputs'
export function StoreSettings() {
  const { operations, backup, files } = useAppServices()
  const { data } = useStoreData()
  const { busy, error, run } = useMutation()
  const [restore, setRestore] = useState<{ name: string; contents: string } | null>(null)
  if (!operations || !data) return null
  async function saveStore(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    if (await run(() => operations!.updateStore(field(form, 'name')), 'Nome da loja atualizado.'))
      window.location.reload()
  }
  async function exportBackup() {
    await run(async () => {
      const content = await backup!.export()
      await files!.save(`balcao-backup-${operations!.today()}.json`, 'application/json', content)
    }, 'Backup preparado. Guarde o arquivo em um local seguro.')
  }
  async function readFile(file: File) {
    await run(async () => {
      if (file.size > 20_000_000) throw new Error('Arquivo muito grande. O limite é 20 MB.')
      setRestore({ name: file.name, contents: await file.text() })
    }, 'Arquivo selecionado para validação.')
  }
  return (
    <div className="stack-lg">
      {error && (
        <Alert title="Não foi possível concluir" tone="danger">
          {error}
        </Alert>
      )}
      <section className="surface workspace-panel stack">
        <h2>Sua loja</h2>
        <form className="stack" onSubmit={saveStore}>
          <Input
            label="Nome da loja"
            name="name"
            defaultValue={data.stores[0]?.name}
            required
            maxLength={160}
          />
          <SaveButton busy={busy}>Salvar nome</SaveButton>
        </form>
      </section>
      <section className="surface workspace-panel stack">
        <h2>Seus dados</h2>
        <p className="muted">
          Os dados ficam neste aparelho. Não há sincronização com outro celular ou computador. Faça
          um backup antes de trocar de aparelho ou limpar o armazenamento.
        </p>
        <Button
          disabled={busy}
          onClick={() => {
            void exportBackup()
          }}
        >
          Exportar backup
        </Button>
        <Input
          label="Restaurar backup em uma instalação vazia"
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void readFile(file)
            e.target.value = ''
          }}
          hint="A restauração valida o arquivo e só é permitida se ainda não houver cadastros ou operações neste aparelho."
        />
      </section>
      {restore && (
        <ConfirmDialog
          open
          title="Restaurar backup?"
          description={`Arquivo: ${restore.name}. A loja atual precisa estar vazia. Após restaurar, o aplicativo será reaberto.`}
          confirmLabel={busy ? 'Restaurando…' : 'Validar e restaurar'}
          onClose={() => {
            if (!busy) setRestore(null)
          }}
          onConfirm={() => {
            void run(() => backup!.restore(restore.contents), 'Backup restaurado.').then((ok) => {
              if (ok) window.location.reload()
              else setRestore(null)
            })
          }}
        />
      )}
    </div>
  )
}
