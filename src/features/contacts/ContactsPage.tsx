import { useState, type FormEvent } from 'react'
import { active, type Contact } from '../../domain/model'
import { useAppServices } from '../../app/providers/services-context'
import { useStoreData } from '../shared/useStoreData'
import { useMutation } from '../shared/useMutation'
import { Button } from '../../design-system/components/Button'
import { Input, SearchField } from '../../design-system/components/Fields'
import { Alert, EmptyState } from '../../design-system/components/Feedback'
import { Modal, ConfirmDialog } from '../../design-system/components/Overlay'
import {
  DataBoundary,
  PageTitle,
  RecordList,
  RecordRow,
  SaveButton,
} from '../../design-system/components/Workspace'
import { field } from '../../application/services/formInputs'
type Kind = 'customers' | 'suppliers'
function ContactEditor({
  kind,
  contact,
  onClose,
}: {
  kind: Kind
  contact?: Contact
  onClose: () => void
}) {
  const { operations } = useAppServices()
  const { busy, error, run } = useMutation()
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    if (
      await run(
        () =>
          operations!.saveContact(
            kind,
            {
              name: field(form, 'name'),
              document: field(form, 'document'),
              phone: field(form, 'phone'),
              email: field(form, 'email'),
              notes: field(form, 'notes'),
            },
            contact?.id,
          ),
        'Cadastro salvo.',
      )
    )
      onClose()
  }
  return (
    <Modal
      open
      title={
        contact ? 'Editar cadastro' : kind === 'customers' ? 'Novo cliente' : 'Novo fornecedor'
      }
      onClose={busy ? () => undefined : onClose}
    >
      <form className="stack" onSubmit={submit}>
        {error && (
          <Alert title="Revise o cadastro" tone="danger">
            {error}
          </Alert>
        )}
        <Input label="Nome" name="name" required maxLength={160} defaultValue={contact?.name} />
        <Input
          label="Documento (opcional)"
          name="document"
          defaultValue={contact?.document}
          maxLength={30}
        />
        <Input
          label="Telefone"
          type="tel"
          name="phone"
          defaultValue={contact?.phone}
          maxLength={40}
        />
        <Input
          label="E-mail"
          type="email"
          name="email"
          defaultValue={contact?.email}
          maxLength={254}
        />
        <Input label="Observações" name="notes" defaultValue={contact?.notes} maxLength={2000} />
        <SaveButton busy={busy}>Salvar cadastro</SaveButton>
      </form>
    </Modal>
  )
}
export function ContactsPage({ kind }: { kind: Kind }) {
  const { data, operations, error, run, reload } = useStoreData()
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<string | null>(null)
  const [archive, setArchive] = useState<Contact | null>(null)
  const suppliers = kind === 'suppliers'
  return (
    <div className="stack-lg">
      <PageTitle
        label={suppliers ? 'Fornecedores' : 'Clientes'}
        title={suppliers ? 'Boas parcerias, por perto.' : 'Quem compra, sempre por perto.'}
        description="Os contatos da sua loja, organizados neste aparelho."
        action={
          <Button onClick={() => setEditor('new')}>
            {suppliers ? 'Novo fornecedor' : 'Novo cliente'}
          </Button>
        }
      />
      <DataBoundary loading={!data} error={error} retry={() => void reload()}>
        {data && (
          <>
            <SearchField
              label="Buscar cadastro"
              placeholder="Nome, telefone ou documento"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {active(data[kind]).length ? (
              <RecordList>
                {active(data[kind])
                  .filter((c) =>
                    [c.name, c.phone, c.document].some((v) =>
                      v.toLowerCase().includes(query.toLowerCase()),
                    ),
                  )
                  .map((c) => (
                    <RecordRow
                      key={c.id}
                      title={c.name}
                      detail={
                        <>
                          {c.phone || 'Sem telefone'}
                          {c.email && (
                            <>
                              <br />
                              {c.email}
                            </>
                          )}
                          {c.notes && (
                            <>
                              <br />
                              {c.notes}
                            </>
                          )}
                        </>
                      }
                      actions={
                        <>
                          <Button
                            variant="ghost"
                            onClick={() => setEditor(c.id)}
                            aria-label={`Editar ${c.name}`}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setArchive(c)}
                            aria-label={`Arquivar ${c.name}`}
                          >
                            Arquivar
                          </Button>
                        </>
                      }
                    />
                  ))}
              </RecordList>
            ) : (
              <EmptyState
                title="Nenhum cadastro por aqui"
                description={
                  suppliers
                    ? 'Adicione fornecedores para associar às suas compras.'
                    : 'Adicione clientes para associar às suas vendas.'
                }
              />
            )}
            {editor && (
              <ContactEditor
                key={editor}
                kind={kind}
                contact={data[kind].find((c) => c.id === editor)}
                onClose={() => setEditor(null)}
              />
            )}
            {archive && (
              <ConfirmDialog
                open
                title="Arquivar cadastro?"
                description={`O histórico de ${archive.name} será preservado.`}
                onClose={() => setArchive(null)}
                onConfirm={() => {
                  void run(
                    () => operations!.archiveContact(kind, archive.id),
                    'Cadastro arquivado.',
                  ).then(() => setArchive(null))
                }}
              />
            )}
          </>
        )}
      </DataBoundary>
    </div>
  )
}
