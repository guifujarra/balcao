import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = resolve(project, 'dist')
const apk = resolve(project, '..', 'BALCAO_ANDROID_TESTE.apk')
const port = Number(process.env.PORT || 4174)
if (!existsSync(resolve(root, 'index.html')))
  throw new Error('Execute pnpm build antes de iniciar a prévia.')
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}
const server = createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405)
    response.end()
    return
  }
  let path
  try {
    path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  } catch {
    response.writeHead(400)
    response.end()
    return
  }
  if (path === '/instalar') {
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    response.end(
      `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Balcão no celular</title><style>body{font:18px system-ui;margin:0;background:#f6f7f3;color:#20362c}main{max-width:520px;margin:64px auto;padding:24px}h1{font-size:32px}a{display:block;padding:16px;margin:16px 0;border-radius:10px;background:#245c45;color:white;text-align:center;text-decoration:none}small{color:#52645a}</style><main><h1>Balcão no seu Android</h1><p>Baixe o aplicativo de teste para usar estoque, vendas e câmera, mesmo sem internet.</p><a href="/BALCAO_ANDROID_TESTE.apk" download>Baixar APK Android · 0.2.1</a><p>Abra o arquivo baixado e permita a instalação pelo navegador quando o Android solicitar. Depois, abra o Balcão.</p><a href="/">Testar pelo navegador</a><small>No navegador deste endereço HTTP, use a digitação de códigos. Cada instalação e navegador guarda seus próprios dados. iPhone exige uma versão iOS compilada no macOS.</small></main></html>`,
    )
    return
  }
  let file = path === '/BALCAO_ANDROID_TESTE.apk' ? apk : resolve(root, '.' + path)
  if (file !== apk && file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403)
    response.end()
    return
  }
  if (file === apk && !existsSync(file)) {
    response.writeHead(404)
    response.end('APK não disponível nesta pasta.')
    return
  }
  if (file !== apk && (!existsSync(file) || !statSync(file).isFile())) {
    if (extname(path)) {
      response.writeHead(404)
      response.end()
      return
    }
    file = resolve(root, 'index.html')
  }
  const headers = {
    'Content-Type':
      file === apk
        ? 'application/vnd.android.package-archive'
        : mime[extname(file)] || 'application/octet-stream',
    'Content-Length': statSync(file).size,
    'Cache-Control': 'no-cache',
  }
  if (file === apk)
    headers['Content-Disposition'] = 'attachment; filename="BALCAO_ANDROID_TESTE.apk"'
  response.writeHead(200, headers)
  if (request.method === 'HEAD') response.end()
  else createReadStream(file).pipe(response)
})
server.listen(port, '0.0.0.0', () =>
  console.log('Balcão: app em http://localhost:' + port + '/ e instalação Android em /instalar.'),
)
