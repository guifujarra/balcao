import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAppServices } from '../../app/providers/services-context'
import { useToast } from '../../app/providers/toast-context'
import { useStoreData } from '../shared/useStoreData'
import { readAppCode } from '../../domain/rules'
import type { Product } from '../../domain/model'
import { Button } from '../../design-system/components/Button'
import { CameraScanner } from '../../design-system/components/CameraScanner'
import { Input } from '../../design-system/components/Fields'
import { Alert, EmptyState } from '../../design-system/components/Feedback'
import { PageTitle, RecordRow, RecordList } from '../../design-system/components/Workspace'
import { ArrowLeft, ScanLine, ShoppingBasket } from '../../design-system/icons'
import { brl, units, cartSummary } from '../../application/services/presentation'

export function ScannerPage() {
  const { scanner, operations } = useAppServices()
  const { data } = useStoreData()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const mode = params.get('modo') ?? 'consulta'
  const selling = mode === 'venda'
  const creating = mode === 'cadastro'
  const auto = params.get('auto') === '1'
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [scanning, setScanning] = useState(false)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torch, setTorch] = useState(false)
  const [manual, setManual] = useState(!auto)
  const [reading, setReading] = useState(false)
  const [result, setResult] = useState<{ code: string; product: Product | null } | null>(null)
  const alive = useRef(true)
  const queue = useRef(Promise.resolve())
  const pending = useRef(0)
  const cart = cartSummary(data)
  const close = useCallback(() => {
    void scanner?.stopScan()
    setScanning(false)
    navigate(selling ? '/vendas' : '/estoque')
  }, [scanner, navigate, selling])
  const resolveCode = useCallback(
    async (value: string) => {
      if (!alive.current) return
      setMessage('')
      setResult(null)
      const clean = value.trim()
      try {
        if (!clean) throw new Error('Informe um código.')
        const appCode = readAppCode(clean)
        if (selling) {
          const { product } = await operations!.addScannedProduct(clean)
          if (alive.current) {
            setCode('')
            notify(`${product.name} adicionado à venda.`, 'success', 1800, true)
          }
          return
        }
        await scanner?.stopScan()
        if (!alive.current) return
        setScanning(false)
        if (appCode?.kind === 'combo') {
          if (creating)
            throw new Error('Este QR é de um combo. Leia o código de barras do produto.')
          navigate(`/combos?combo=${encodeURIComponent(appCode.id)}`)
          return
        }
        const product = await operations!.findCode(clean)
        if (!alive.current) return
        if (creating && !product) {
          if (appCode)
            throw new Error('Este QR pertence a um produto que não está cadastrado nesta loja.')
          navigate(`/estoque?acao=codigo&barcode=${encodeURIComponent(clean)}`)
          return
        }
        setCode(clean)
        setResult({ code: clean, product })
      } catch (error) {
        if (!alive.current) return
        setMessage(error instanceof Error ? error.message : 'Não foi possível consultar o código.')
        if (
          selling &&
          error instanceof Error &&
          error.message === 'Produto não encontrado nesta loja.' &&
          !clean.startsWith('app:')
        ) {
          setResult({ code: clean, product: null })
        }
      }
    },
    [creating, selling, scanner, operations, navigate, notify],
  )
  const receive = useCallback(
    (value: string) => {
      if (!alive.current) return
      pending.current++
      setReading(true)
      queue.current = queue.current
        .then(() => resolveCode(value))
        .finally(() => {
          pending.current--
          if (alive.current) setReading(pending.current > 0)
        })
    },
    [resolveCode],
  )
  const start = useCallback(() => {
    setScanning(true)
    setMessage('')
    setResult(null)
    setTorch(false)
    setTorchAvailable(false)
  }, [])
  useEffect(() => {
    if (!scanning) return
    let active = true
    // O painel e a área de vídeo precisam estar montados antes de abrir a câmera.
    void scanner
      ?.startScan('balcao-camera', receive, (error) => {
        if (active && alive.current) {
          setMessage(error)
          setScanning(false)
          setManual(true)
        }
      })
      .then(async () => {
        const available = await scanner?.torchAvailable?.()
        if (active) setTorchAvailable(Boolean(available))
      })
    return () => {
      active = false
      void scanner?.stopScan()
    }
  }, [scanning, scanner, receive])
  useEffect(() => {
    alive.current = true
    const initialScan = auto ? setTimeout(start, 0) : undefined
    const cancel = () => close()
    window.addEventListener('balcao:close-scanner', cancel)
    const hidden = () => {
      if (document.hidden) {
        void scanner?.stopScan()
        setScanning(false)
      }
    }
    document.addEventListener('visibilitychange', hidden)
    return () => {
      alive.current = false
      clearTimeout(initialScan)
      void scanner?.stopScan()
      window.removeEventListener('balcao:close-scanner', cancel)
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [scanner, start, auto, close])
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    receive(code)
  }
  const unavailable = scanner?.unavailableReason()
  return (
    <div className="stack scanner-page" data-scan-active={scanning ? 'true' : undefined}>
      {!scanning && (
        <>
          <PageTitle
            label={selling ? 'Vendas' : 'Estoque'}
            title={
              selling
                ? 'Ler para vender.'
                : creating
                  ? 'Ler código de barras.'
                  : 'Consultar um código.'
            }
            description={
              selling
                ? 'Leia o próximo produto. Para repetir, afaste o código.'
                : 'Aponte a câmera para o código do produto.'
            }
            action={
              selling ? undefined : (
                <Button variant="ghost" onClick={close}>
                  <ArrowLeft aria-hidden="true" /> Voltar ao estoque
                </Button>
              )
            }
          />
          {unavailable && (
            <Alert tone="info" title="Use a entrada manual">
              {unavailable}
            </Alert>
          )}
          {message && (
            <Alert tone="warning" title="Confira a leitura">
              {message}
            </Alert>
          )}
          <section className="surface workspace-panel stack">
            <div className="spread">
              <Button onClick={start} disabled={Boolean(unavailable)}>
                <ScanLine aria-hidden="true" /> Abrir câmera
              </Button>
              <Button variant="ghost" aria-expanded={manual} onClick={() => setManual(true)}>
                Digitar código
              </Button>
            </div>
            {manual && (
              <form className="stack" onSubmit={submit}>
                <Input
                  label="Código de barras ou QR"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Digite ou cole o código"
                  required
                />
                <Button type="submit" variant="secondary" disabled={reading}>
                  {selling ? 'Adicionar à venda' : 'Consultar código'}
                </Button>
              </form>
            )}
          </section>
          {selling && (
            <Button onClick={close} variant={cart.count ? 'primary' : 'secondary'}>
              <ShoppingBasket aria-hidden="true" /> Ver carrinho
              {cart.count
                ? ` · ${cart.count} ${cart.count === 1 ? 'produto' : 'produtos'} · ${brl(cart.sale!.subtotal)}`
                : ''}
            </Button>
          )}
          {result &&
            (result.product ? (
              <section className="stack">
                <h2>Produto encontrado</h2>
                <RecordList>
                  <RecordRow
                    title={result.product.name}
                    detail={`${units(result.product.quantity)} ${result.product.unit} disponíveis`}
                    value={brl(result.product.salePrice)}
                  />
                </RecordList>
                <div className="form-actions">
                  <Button onClick={() => navigate(`/estoque?produto=${result.product!.id}`)}>
                    Ver produto
                  </Button>
                  {!creating && (
                    <Button
                      variant="secondary"
                      onClick={() => navigate('/escanear?modo=venda&auto=1')}
                    >
                      Escanear para vender
                    </Button>
                  )}
                </div>
              </section>
            ) : (
              <EmptyState
                title="Produto ainda não cadastrado"
                description={`O código ${result.code} não foi encontrado nesta loja.`}
                action={
                  <Button
                    onClick={() => {
                      void scanner?.stopScan()
                      navigate(
                        `/estoque?acao=codigo&barcode=${encodeURIComponent(result.code)}${selling ? '&retorno=venda' : ''}`,
                      )
                    }}
                  >
                    Cadastrar com este código
                  </Button>
                }
              />
            ))}
        </>
      )}
      {scanning && (
        <CameraScanner
          title={selling ? 'Escanear produtos' : 'Ler código de barras'}
          selling={selling}
          cartLabel={
            cart.count
              ? `Ver carrinho · ${cart.count} ${cart.count === 1 ? 'produto' : 'produtos'} · ${brl(cart.sale!.subtotal)}`
              : 'Ver carrinho'
          }
          onClose={close}
          onManual={() => {
            setScanning(false)
            setManual(true)
            setTimeout(
              () => document.querySelector<HTMLInputElement>('.scanner-page input')?.focus(),
              0,
            )
          }}
          torchAvailable={torchAvailable}
          torch={torch}
          onTorch={() => {
            const next = !torch
            void scanner
              ?.setTorch?.(next)
              .then(() => setTorch(next))
              .catch(() => {
                setMessage('Não foi possível ligar a lanterna.')
              })
          }}
        >
          {message && (
            <Alert tone="warning" title="Confira a leitura">
              {message}
            </Alert>
          )}
          {result && !result.product && (
            <div className="camera-unknown stack">
              <strong>Produto ainda não cadastrado</strong>
              <Button
                variant="secondary"
                onClick={() => {
                  void scanner?.stopScan()
                  navigate(
                    `/estoque?acao=codigo&barcode=${encodeURIComponent(result.code)}${selling ? '&retorno=venda' : ''}`,
                  )
                }}
              >
                Cadastrar com este código
              </Button>
            </div>
          )}
        </CameraScanner>
      )}
    </div>
  )
}
