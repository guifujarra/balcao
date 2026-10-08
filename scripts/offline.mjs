import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const entries = [
  'index.html',
  'favicon.svg',
  'manifest.webmanifest',
  ...(await readdir('dist/assets')).map((name) => 'assets/' + name),
]
const version = createHash('sha256')
  .update(await readFile('dist/index.html'))
  .digest('hex')
  .slice(0, 16)
const urls = JSON.stringify(entries.map((name) => './' + name))
await writeFile(
  'dist/sw.js',
  `const CACHE='balcao-${version}';const FILES=${urls};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('balcao-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(async cache=>{if(event.request.mode==='navigate')return(await cache.match('./index.html'))||fetch(event.request);return(await cache.match(event.request,{ignoreVary:true}))||fetch(event.request)}))});`,
)
console.log('Cache offline gerado para ' + entries.length + ' arquivos.')
