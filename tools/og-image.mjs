// Renders public/og.png (1200x630) from the running site: node tools/og-image.mjs [url]
import puppeteer from 'puppeteer-core'
const url = process.argv[2] || 'http://localhost:5173'
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], defaultViewport: { width: 1200, height: 630 } })
const page = await browser.newPage()
await page.goto(url, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => document.querySelector('.loader')?.dataset.done === 'true', { timeout: 60000 })
await page.addStyleTag({ content: '.bottom,.controls,.tip{display:none!important}' })
await page.mouse.move(600, 315)
await new Promise((r) => setTimeout(r, 3500))
await page.screenshot({ path: 'public/og.png' })
await browser.close()
console.log('wrote public/og.png')
