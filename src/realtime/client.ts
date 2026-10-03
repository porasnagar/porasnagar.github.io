import { site } from '../content/load'
import { useStore, type Note } from '../state/store'

const LOCAL_KEY = 'listening-room:notes'
const set = (p: Parameters<ReturnType<typeof useStore.getState>['set']>[0]) => useStore.getState().set(p)

function readLocalNotes(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
  } catch {
    return []
  }
}

function writeLocalNotes(notes: Note[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(notes.slice(-40)))
  } catch {}
}

class Realtime {
  private ws: WebSocket | null = null
  private failures = 0
  private current: string | null = null
  private retry: number | null = null
  private channel: BroadcastChannel | null = null
  private errorCb: ((retryIn: number) => void) | null = null

  connect() {
    if (this.ws) return
    const env = import.meta.env.VITE_RT_URL as string | undefined
    const local = /^(localhost|127.0.0.1)$/.test(location.hostname)
    const url = env || (!local && site.realtimeUrl) || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/rt`
    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch {
      this.fail()
      return
    }
    this.ws = ws
    ws.onopen = () => {
      this.failures = 0
      set({ rtStatus: 'live' })
      if (this.current) this.send({ t: 'play', record: this.current })
    }
    ws.onmessage = (e) => this.handle(e.data)
    ws.onclose = () => {
      this.ws = null
      this.fail()
    }
  }

  private fail() {
    this.failures++
    if (this.failures >= 2 && useStore.getState().rtStatus !== 'local') this.goLocal()
    const delay = Math.min(60_000, 1500 * 2 ** Math.min(this.failures, 6))
    if (this.retry) clearTimeout(this.retry)
    this.retry = window.setTimeout(() => this.connect(), delay)
  }

  private goLocal() {
    set({ rtStatus: 'local', online: 1, notes: readLocalNotes() })
    if (!this.channel && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('listening-room')
      this.channel.onmessage = (e) => {
        if (e.data?.t === 'note') {
          const notes = [...useStore.getState().notes, e.data.note]
          set({ notes })
        }
      }
    }
  }

  private handle(raw: string) {
    let m: any
    try {
      m = JSON.parse(raw)
    } catch {
      return
    }
    if (m.t === 'state') {
      set({ online: m.online, listening: m.listening, notes: m.notes, plays: m.plays })
    } else if (m.t === 'presence') {
      set({ online: m.online, listening: m.listening })
    } else if (m.t === 'plays') {
      set({ plays: m.plays })
    } else if (m.t === 'note') {
      set({ notes: [...useStore.getState().notes, m.note].slice(-60) })
    } else if (m.t === 'spin') {
      set({ spins: [{ record: m.record, at: m.at }, ...useStore.getState().spins].slice(0, 12) })
    } else if (m.t === 'error' && m.code === 'slow') {
      this.errorCb?.(m.retryIn)
    }
  }

  private send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }

  play(record: string | null) {
    this.current = record
    this.send({ t: 'play', record })
    if (useStore.getState().rtStatus === 'local' && record) {
      const plays = { ...useStore.getState().plays }
      plays[record] = (plays[record] || 0) + 1
      set({ plays })
    }
  }

  note(name: string, text: string, onSlow: (retryIn: number) => void) {
    this.errorCb = onSlow
    if (useStore.getState().rtStatus === 'live') {
      this.send({ t: 'note', name, text })
      return
    }
    const note: Note = {
      id: Date.now().toString(36),
      name: name.trim().slice(0, 24) || 'anonymous',
      text: text.trim().slice(0, 140),
      at: Date.now(),
    }
    const notes = [...useStore.getState().notes, note]
    set({ notes })
    writeLocalNotes(notes)
    this.channel?.postMessage({ t: 'note', note })
  }
}

export const rt = new Realtime()
