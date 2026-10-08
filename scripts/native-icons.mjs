import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
// Rasterização determinística da marca SVG usada no app, para os catálogos nativos.
const svg = await readFile('public/favicon.svg', 'utf8')
const browser = await chromium.launch()
try {
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1,
  })
  await page.setContent(
    '<style>html,body{margin:0;width:100%;height:100%;background:#245c45}svg{display:block;width:100%;height:100%}</style>' +
      svg,
  )
  const icon = await page.screenshot()
  await writeFile('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', icon)
  await page.setViewportSize({ width: 2732, height: 2732 })
  await page.setContent(
    '<style>html,body{margin:0;width:100%;height:100%;background:#245c45}body{display:grid;place-items:center}svg{width:460px;height:460px}</style>' +
      svg,
  )
  const splash = await page.screenshot()
  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
    await writeFile('ios/App/App/Assets.xcassets/Splash.imageset/' + name, splash)
  console.log('Ícone e splash iOS exportados da marca SVG. Compilação iOS exige macOS/Xcode.')
} finally {
  await browser.close()
}
