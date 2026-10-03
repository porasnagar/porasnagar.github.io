// Load test: node tools/test-load.mjs <url> [swiftshader|gpu] [headless|headed]
import puppeteer from 'puppeteer-core'
const url = process.argv[2] || 'http://localhost:5173'
const mode = process.argv[3] || 'gpu'
const headless = (process.argv[4] || 'headless') === 'headless' ? 'new' : false
const args = mode === 'swiftshader' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist']
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless, args, defaultViewport: { width: 1440, height: 900 }, protocolTimeout: 120000 })
const page = await browser.newPage()
const logs = []
page.on('console', (m) => logs.push(`${m.type()}: ${m.text().slice(0, 200)}`))
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`))
const t0 = Date.now()
await page.goto(url, { waitUntil: 'domcontentloaded' })
let ready = null
for (let i = 0; i < 90; i++) {
  const s = await page.evaluate(() => ({ done: document.querySelector('.loader')?.dataset.done, canvas: !!document.querySelector('canvas'), root: document.getElementById('root')?.children.length }))
  if (s.done === 'true') { ready = Date.now() - t0; break }
  if (i % 10 === 0) console.log(`t=${Date.now() - t0}ms`, JSON.stringify(s))
  await new Promise((r) => setTimeout(r, 1000))
}
const renderer = await page.evaluate(() => { const g = document.querySelector('canvas')?.getContext('webgl2'); const d = g?.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a' })
console.log(JSON.stringify({ mode, ready, renderer, logs: logs.filter((l) => !/vite|React DevTools|THREE.Clock/.test(l)).slice(0, 12) }, null, 2))
await browser.close()
