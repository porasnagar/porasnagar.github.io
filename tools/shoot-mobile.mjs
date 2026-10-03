// Phone-emulated screenshots of each view: node tools/shoot-mobile.mjs <outDir> [url] [prefix]
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const out = process.argv[2] || 'shots'
const url = process.argv[3] || 'http://localhost:5173'
const prefix = process.argv[4] || 'm'
fs.mkdirSync(out, { recursive: true })
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
  protocolTimeout: 120000,
})
const page = await browser.newPage()
await page.emulate({
  viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
})
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
const t0 = Date.now()
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => document.querySelector('.loader')?.dataset.done === 'true', { timeout: 90000 })
const readyMs = Date.now() - t0
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const shot = async (name, ms = 2200) => {
  await wait(ms)
  await page.screenshot({ path: path.join(out, `${prefix}_${name}.png`) })
}
const steps = JSON.parse(process.env.STEPS || 'null') || [
  { name: 'room' },
  { name: 'hifi', state: { view: 'hifi' } },
  { name: 'playing', run: "window.__deck.putOn('lumavoice')", wait: 4500 },
  { name: 'screen', state: { view: 'screen' } },
  { name: 'board', state: { view: 'board' } },
  { name: 'list', state: { view: 'room', listOpen: true } },
]
await shot('room0', 2500)
for (const s of steps) {
  if (s.state) await page.evaluate((st) => window.__store.getState().set(st), s.state)
  if (s.run) await page.evaluate(s.run)
  await shot(s.name, s.wait ?? 2200)
}
const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t = performance.now(); const f = () => (performance.now() - t < 2000 ? (n++, requestAnimationFrame(f)) : r(n / 2)); requestAnimationFrame(f) }))
console.log(JSON.stringify({ readyMs, fps, errs }))
await browser.close()
