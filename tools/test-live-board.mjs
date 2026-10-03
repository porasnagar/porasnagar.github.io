// Opens the live site, clicks the corkboard, screenshots it: node tools/test-live-board.mjs <out.png>
import puppeteer from 'puppeteer-core'
const out = process.argv[2] || 'live_board.png'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu'], defaultViewport: { width: 1440, height: 900 } })
const p = await b.newPage()
await p.goto('https://porasnagar.github.io/?v=' + Date.now(), { waitUntil: 'domcontentloaded' })
await p.waitForFunction(() => document.querySelector('.loader')?.dataset.done === 'true', { timeout: 60000 })
await p.waitForFunction(() => document.querySelector('.presence')?.dataset.status === 'live', { timeout: 90000 }).catch(() => {})
await new Promise((r) => setTimeout(r, 2000))
await p.mouse.move(455, 300)
await new Promise((r) => setTimeout(r, 300))
await p.mouse.click(455, 300)
await new Promise((r) => setTimeout(r, 3000))
console.log('presence:', await p.$eval('.presence', (e) => e.textContent), '| hint:', await p.$eval('.hint', (e) => e.textContent))
await p.screenshot({ path: out })
await b.close()
