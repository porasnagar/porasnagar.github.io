// Headless screenshots of each camera view: node tools/shoot.mjs [outDir] [url] [WxH]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const outDir = process.argv[2] || 'shots'
const url = process.argv[3] || 'http://localhost:5173'
const [w, h] = (process.argv[4] || '1440x900').split('x').map(Number)
const steps = JSON.parse(process.env.SHOTS || 'null') || [
  { name: 'room', state: { view: 'room' } },
  { name: 'hifi', state: { view: 'hifi' } },
  { name: 'play', run: "window.__deck.putOn('lumavoice')", wait: 4200 },
  { name: 'screen', state: { view: 'screen', input: 'PHONO' } },
  { name: 'tuner', state: { input: 'TUNER' } },
  { name: 'aux', state: { input: 'AUX' } },
  { name: 'tape', state: { input: 'TAPE' } },
  { name: 'window', state: { view: 'window' } },
  { name: 'board', state: { view: 'board' } },
  { name: 'night', state: { view: 'room', lightMode: 'night' } },
]

fs.mkdirSync(outDir, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  defaultViewport: { width: w, height: h, deviceScaleFactor: 1 },
})
const page = await browser.newPage()
const logs = []
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warn') && logs.push(`${m.type()}: ${m.text()}`))
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`))
const t0 = Date.now()
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => document.querySelector('.loader')?.dataset.done === 'true', { timeout: 60000 })
const readyMs = Date.now() - t0
await new Promise((r) => setTimeout(r, 2500))
const renderer = await page.evaluate(() => {
  const g = document.querySelector('canvas')?.getContext('webgl2')
  const d = g?.getExtension('WEBGL_debug_renderer_info')
  return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a'
})
for (const s of steps) {
  if (s.state) await page.evaluate((st) => window.__store.getState().set(st), s.state)
  if (s.run) await page.evaluate(s.run)
  await new Promise((r) => setTimeout(r, s.wait ?? 2200))
  await page.screenshot({ path: path.join(outDir, `${s.name}.png`) })
}
const fps = await page.evaluate(
  () =>
    new Promise((r) => {
      let n = 0
      const t = performance.now()
      const f = () => (performance.now() - t < 2000 ? (n++, requestAnimationFrame(f)) : r(n / 2))
      requestAnimationFrame(f)
    }),
)
console.log(JSON.stringify({ readyMs, renderer, fps, logs: logs.slice(0, 15) }, null, 2))
await browser.close()
