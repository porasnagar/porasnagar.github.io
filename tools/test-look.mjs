// Desktop look controls in the room view: mouse hover, trackpad two-finger swipe, pinch and mouse-wheel zoom.
// node tools/test-look.mjs <outDir>
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const out = process.argv[2] || 'shots'
fs.mkdirSync(out, { recursive: true })
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], defaultViewport: { width: 1440, height: 900 } })
const p = await b.newPage()
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => document.querySelector('.loader')?.dataset.done === 'true', { timeout: 60000 })
await new Promise((r) => setTimeout(r, 2500))
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const state = () =>
  p.evaluate(() => {
    const orbit = window.__orbit
    const hover = window.__hover
    const lamp = window.__project('lamp_shade')
    return { view: window.__store.getState().view, yaw: +orbit.yaw.toFixed(3), pitch: +orbit.pitch.toFixed(3), zoom: +orbit.zoom.toFixed(3), hx: +hover.x.toFixed(2), hy: +hover.y.toFixed(2), lamp, pageScale: visualViewport.scale }
  })
const log = async (label) => console.log(label.padEnd(26), JSON.stringify(await state()))

await p.mouse.move(720, 450)
await wait(1800)
await log('hover centre')
await p.screenshot({ path: path.join(out, 'look_centre.png') })
await p.mouse.move(40, 450, { steps: 8 })
await wait(1800)
await log('hover left edge')
await p.screenshot({ path: path.join(out, 'look_left.png') })
await p.mouse.move(1400, 450, { steps: 12 })
await wait(1800)
await log('hover right edge')
await p.screenshot({ path: path.join(out, 'look_right.png') })
await p.mouse.move(720, 450, { steps: 8 })
await wait(1200)

for (let i = 0; i < 12; i++) await p.mouse.wheel({ deltaX: 24, deltaY: 0 })
await wait(1500)
await log('trackpad swipe right x12')
for (let i = 0; i < 10; i++) await p.mouse.wheel({ deltaX: 0, deltaY: 12 })
await wait(1500)
await log('trackpad swipe down x10')
await p.screenshot({ path: path.join(out, 'look_swiped.png') })

await wait(600)
await p.keyboard.down('Control')
for (let i = 0; i < 10; i++) await p.mouse.wheel({ deltaY: -8 })
await p.keyboard.up('Control')
await wait(1500)
await log('pinch out (zoom in) x10')
await p.screenshot({ path: path.join(out, 'look_pinched.png') })

await wait(600)
for (let i = 0; i < 3; i++) {
  await p.mouse.wheel({ deltaY: 100 })
  await wait(80)
}
await wait(1500)
await log('mouse wheel down x3')
console.log('errors:', errs.length ? errs : 'none')
await b.close()
