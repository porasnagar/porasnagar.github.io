// Two browsers on the live site; both should report realtime "live" and see each other.
import puppeteer from 'puppeteer-core'
const url = process.argv[2] || 'https://porasnagar.github.io/'
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu'], defaultViewport: { width: 1280, height: 800 }, protocolTimeout: 120000 })
const open = async () => {
  const p = await b.newPage()
  await p.goto(url + '?v=' + Date.now(), { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => document.querySelector('.loader')?.dataset.done === 'true', { timeout: 60000 })
  return p
}
const a = await open()
const c = await open()
await new Promise((r) => setTimeout(r, 5000))
for (const [n, p] of [['A', a], ['B', c]]) {
  await p.bringToFront()
  console.log(n, await p.$eval('.presence', (e) => `${e.dataset.status} / ${e.textContent}`))
}
await b.close()
