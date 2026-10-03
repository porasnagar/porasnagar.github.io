import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sirv from 'sirv'
import { WebSocketServer } from 'ws'
import { createStorage } from './storage.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(root, '..', 'dist')
const DATA_DIR = process.env.DATA_DIR || path.join(root, 'data')
const argPort = process.argv.indexOf('--port')
const PORT = Number(argPort > 0 ? process.argv[argPort + 1] : process.env.PORT) || 8787
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)

const MAX_NOTES = 120
const NOTE_COOLDOWN_MS = 20_000
const PLAY_COOLDOWN_MS = 45_000
const ID_RE = /^[a-z0-9-]{1,40}$/

const storage = createStorage({ dataDir: DATA_DIR })
let store = { notes: [], plays: {} }
const loaded = await Promise.race([storage.load(), new Promise((r) => setTimeout(() => r(null), 8000))])
if (loaded && typeof loaded === 'object') {
  store = { notes: Array.isArray(loaded.notes) ? loaded.notes.slice(-120) : [], plays: loaded.plays && typeof loaded.plays === 'object' ? loaded.plays : {} }
}
const persist = () => storage.schedule(() => store)

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    await storage.flush(() => store)
    process.exit(0)
  })
}

const clean = (s, max) =>
  String(s ?? '')
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)

const serveStatic = fs.existsSync(DIST) ? sirv(DIST, { single: true, etag: true, gzip: true, brotli: true }) : null

const server = http.createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' })
    return res.end('ok')
  }
  if (serveStatic) return serveStatic(req, res)
  res.writeHead(404, { 'content-type': 'text/plain' })
  res.end('Realtime server only. Run `npm run build` to serve the site from here.')
})

const wss = new WebSocketServer({ server, path: '/rt', maxPayload: 2048 })
const clients = new Map()

function listening() {
  const out = {}
  for (const c of clients.values()) if (c.record) out[c.record] = (out[c.record] || 0) + 1
  return out
}

function broadcast(msg, except) {
  const data = JSON.stringify(msg)
  for (const ws of clients.keys()) if (ws !== except && ws.readyState === 1) ws.send(data)
}

function presence() {
  broadcast({ t: 'presence', online: clients.size, listening: listening() })
}

wss.on('connection', (ws, req) => {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.length && origin && !ALLOWED_ORIGINS.includes(origin)) {
    ws.close(1008, 'origin')
    return
  }
  const client = { record: null, lastNote: 0, lastPlay: {}, alive: true }
  clients.set(ws, client)

  ws.send(
    JSON.stringify({
      t: 'state',
      online: clients.size,
      listening: listening(),
      notes: store.notes.slice(-40),
      plays: store.plays,
    }),
  )
  presence()

  ws.on('pong', () => (client.alive = true))

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(String(raw))
    } catch {
      return
    }
    if (!msg || typeof msg.t !== 'string') return

    if (msg.t === 'play') {
      const rec = msg.record === null ? null : String(msg.record)
      if (rec !== null && !ID_RE.test(rec)) return
      if (client.record === rec) return
      client.record = rec
      if (rec) {
        const now = Date.now()
        if (now - (client.lastPlay[rec] || 0) > PLAY_COOLDOWN_MS) {
          client.lastPlay[rec] = now
          store.plays[rec] = (store.plays[rec] || 0) + 1
          persist()
          broadcast({ t: 'plays', plays: store.plays })
          broadcast({ t: 'spin', record: rec, at: now }, ws)
        }
      }
      presence()
      return
    }

    if (msg.t === 'note') {
      const now = Date.now()
      if (now - client.lastNote < NOTE_COOLDOWN_MS) {
        ws.send(JSON.stringify({ t: 'error', code: 'slow', retryIn: NOTE_COOLDOWN_MS - (now - client.lastNote) }))
        return
      }
      const text = clean(msg.text, 140)
      const name = clean(msg.name, 24) || 'anonymous'
      if (text.length < 2) return
      client.lastNote = now
      const note = { id: `${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, text, at: now }
      store.notes.push(note)
      if (store.notes.length > MAX_NOTES) store.notes = store.notes.slice(-MAX_NOTES)
      persist()
      broadcast({ t: 'note', note })
    }
  })

  ws.on('close', () => {
    clients.delete(ws)
    presence()
  })
})

const heartbeat = setInterval(() => {
  for (const [ws, c] of clients) {
    if (!c.alive) {
      ws.terminate()
      continue
    }
    c.alive = false
    ws.ping()
  }
}, 30_000)
wss.on('close', () => clearInterval(heartbeat))

server.listen(PORT, () => {
  console.log(`listening room realtime on :${PORT} · storage: ${storage.mode} · ${store.notes.length} notes${serveStatic ? ' · serving dist' : ''}`)
})
