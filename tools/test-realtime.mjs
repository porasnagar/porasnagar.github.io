import puppeteer from 'puppeteer-core'
const out = process.argv[2]
const browser = await puppeteer.launch({ protocolTimeout: 60000, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], defaultViewport: { width: 1280, height: 800 } })
const open = async () => {
  const p = await browser.newPage()
  await p.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => document.querySelector('.loader')?.dataset.done === 'true', { timeout: 60000 })
  return p
}
const a = await open()
const b = await open()
await new Promise((r) => setTimeout(r, 1500))
const snap = (p) => p.evaluate(() => { const s = window.__store.getState(); return { rt: s.rtStatus, online: s.online, notes: s.notes.length, lastNote: s.notes.at(-1)?.text, listening: s.listening, spins: s.spins.length } })
console.log('A', JSON.stringify(await snap(a)))
console.log('B', JSON.stringify(await snap(b)))
// A pins a note through the real form on the board view
await a.bringToFront()
await a.evaluate(() => window.__store.getState().set({ view: 'board' }))
await new Promise((r) => setTimeout(r, 1200))
await a.type('.board-panel input', 'Test visitor')
await a.type('.board-panel textarea', 'Realtime check ' + new Date().toISOString().slice(11, 19))
await a.click('.board-panel button[type=submit]')
// A plays a record
await a.evaluate(() => window.__deck.putOn('hermes'))
await new Promise((r) => setTimeout(r, 3500))
await b.bringToFront()
console.log('B after', JSON.stringify(await snap(b)))
await b.evaluate(() => window.__store.getState().set({ view: 'board' }))
await new Promise((r) => setTimeout(r, 2500))
await b.screenshot({ path: out + '/rt_board.png' })
// slow-down guard: second note immediately
await a.bringToFront()
await a.evaluate(() => { document.querySelector('.board-panel textarea').value = '' })
await a.type('.board-panel textarea', 'spam')
await a.click('.board-panel button[type=submit]')
await new Promise((r) => setTimeout(r, 800))
console.log('A msg', await a.$eval('.note-msg', (e) => e.textContent))
await a.close()
await b.bringToFront()
await new Promise((r) => setTimeout(r, 1500))
console.log('B after A left', JSON.stringify(await snap(b)))
await browser.close()
