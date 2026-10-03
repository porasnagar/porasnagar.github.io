import { profile } from '../content/profile'
import { useStore, type GhEvent } from '../state/store'

const set = (p: Parameters<ReturnType<typeof useStore.getState>['set']>[0]) => useStore.getState().set(p)

let clockFmt: Intl.DateTimeFormat | null = null
let clockTz = ''
const fmt = () => {
  if (!clockFmt || clockTz !== profile.timeZone) {
    clockTz = profile.timeZone
    clockFmt = new Intl.DateTimeFormat('en-GB', { timeZone: clockTz, hour: '2-digit', minute: '2-digit', hour12: false })
  }
  return clockFmt
}
let clockCache = { at: 0, text: '' }

export function localClock(d?: Date) {
  if (d) return fmt().format(d)
  const now = Date.now()
  if (now - clockCache.at > 1000) clockCache = { at: now, text: fmt().format(now) }
  return clockCache.text
}

export function sunElevation(d = new Date(), lat = profile.coords.lat, lon = profile.coords.lon) {
  const rad = Math.PI / 180
  const day = (Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5
  const hours = d.getUTCHours() + d.getUTCMinutes() / 60
  const g = ((2 * Math.PI) / 365) * (day - 1 + (hours - 12) / 24)
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  const eqt =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const solarMinutes = hours * 60 + eqt + 4 * lon
  const ha = (solarMinutes / 4 - 180) * rad
  const cosZen = Math.sin(lat * rad) * Math.sin(decl) + Math.cos(lat * rad) * Math.cos(decl) * Math.cos(ha)
  return 90 - Math.acos(Math.min(1, Math.max(-1, cosZen))) / rad
}

export function weatherLabel(code: number) {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly cloudy'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if (code >= 61 && code <= 67) return 'rain'
  if (code >= 71 && code <= 77) return 'snow'
  if (code >= 80 && code <= 82) return 'showers'
  if (code >= 95) return 'thunderstorm'
  return 'unsettled'
}

export const isRainy = (code: number) => (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95

async function fetchWeather() {
  const { lat, lon } = profile.coords
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code,is_day,cloud_cover,precipitation,wind_speed_10m&timezone=auto`
  try {
    const r = await fetch(url)
    if (!r.ok) return
    const j = await r.json()
    const c = j.current
    set({
      weather: {
        temp: c.temperature_2m,
        code: c.weather_code,
        isDay: c.is_day === 1,
        cloud: c.cloud_cover,
        precip: c.precipitation,
        wind: c.wind_speed_10m,
        fetchedAt: Date.now(),
      },
    })
  } catch {}
}

function describe(e: any): string | null {
  const p = e.payload || {}
  switch (e.type) {
    case 'PushEvent': {
      const msg = p.commits?.[p.commits.length - 1]?.message?.split('\n')[0]
      const branch = (p.ref || '').replace('refs/heads/', '')
      return msg ? msg : `pushed to ${branch || 'a branch'}`
    }
    case 'CreateEvent':
      return p.ref_type === 'repository' ? 'created the repository' : `created ${p.ref_type} ${p.ref ?? ''}`.trim()
    case 'PullRequestEvent':
      return `${p.action} pull request: ${p.pull_request?.title ?? ''}`
    case 'IssuesEvent':
      return `${p.action} issue: ${p.issue?.title ?? ''}`
    case 'ReleaseEvent':
      return `released ${p.release?.tag_name ?? ''}`
    case 'WatchEvent':
      return 'starred'
    case 'ForkEvent':
      return 'forked'
    case 'PublicEvent':
      return 'made the repository public'
    default:
      return null
  }
}

async function fetchGithub() {
  try {
    const r = await fetch(`https://api.github.com/users/${encodeURIComponent(profile.github)}/events/public?per_page=40`)
    if (!r.ok) {
      set({ githubError: true })
      return
    }
    const list = (await r.json()) as any[]
    const events: GhEvent[] = []
    for (const e of list) {
      const text = describe(e)
      if (!text) continue
      events.push({
        id: e.id,
        type: e.type,
        repo: String(e.repo?.name || '').replace(`${profile.github}/`, ''),
        text,
        at: Date.parse(e.created_at),
      })
    }
    set({ github: events.slice(0, 20), githubError: false })
  } catch {
    set({ githubError: true })
  }
}

export function startFeeds() {
  void fetchWeather()
  void fetchGithub()
  const w = window.setInterval(fetchWeather, 10 * 60_000)
  const g = window.setInterval(fetchGithub, 5 * 60_000)
  return () => {
    clearInterval(w)
    clearInterval(g)
  }
}

export function ago(at: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return `${d} d ago`
}
