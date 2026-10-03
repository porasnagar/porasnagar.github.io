import { profile } from './profile'
import { records, type Pattern, type RecordEntry, type WorldId } from './records'

export const site = { realtimeUrl: '' as string }

const PATTERNS: Pattern[] = ['rings', 'bars', 'grid', 'wave', 'stripes', 'dots', 'arc']
const WORLDS: WorldId[] = ['city', 'sea', 'dawn', 'desert', 'rain', 'space']
const PALETTES = [
  { bg: '#e4572e', fg: '#1a1210', accent: '#f6e7cb' },
  { bg: '#1f2a44', fg: '#f2efe6', accent: '#e8a33d' },
  { bg: '#2d6a4f', fg: '#f1f4e8', accent: '#f4c95d' },
  { bg: '#f2efe6', fg: '#1b4965', accent: '#d2452f' },
  { bg: '#f4c95d', fg: '#1a1210', accent: '#2d6a4f' },
  { bg: '#5a3a28', fg: '#f6e7cb', accent: '#e8a33d' },
  { bg: '#3a86a8', fg: '#f2efe6', accent: '#1a1210' },
  { bg: '#2b2d42', fg: '#edf2f4', accent: '#8d99ae' },
]

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'record'

const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

function normalise(raw: any, i: number): RecordEntry | null {
  if (!raw || typeof raw !== 'object' || !raw.title) return null
  const id = /^[a-z0-9-]{1,40}$/.test(raw.id) ? raw.id : slug(String(raw.title))
  const h = hash(id)
  const side = (v: any, label: string, alt: unknown) =>
    v && typeof v === 'object' ? { label: str(v.label, label), text: str(v.text) } : { label, text: str(v ?? alt) }
  return {
    id,
    title: str(raw.title),
    subtitle: str(raw.subtitle),
    year: str(raw.year, String(raw.year ?? '')),
    status: raw.status ? str(raw.status) : undefined,
    sideA: side(raw.sideA, 'The problem', raw.problem),
    sideB: side(raw.sideB, 'What I built', raw.built),
    tracks: strs(raw.tracks),
    credits: strs(raw.credits ?? raw.stack),
    links: Array.isArray(raw.links)
      ? raw.links.filter((l: any) => l && typeof l.href === 'string' && /^https?:\/\//.test(l.href)).map((l: any) => ({ label: str(l.label, 'Link'), href: l.href }))
      : [],
    sleeve: {
      ...PALETTES[(h + i) % PALETTES.length],
      pattern: PATTERNS[h % PATTERNS.length],
      ...(raw.sleeve && typeof raw.sleeve === 'object' ? raw.sleeve : {}),
    },
    world: WORLDS.includes(raw.world) || raw.world === 'live' ? raw.world : WORLDS[h % WORLDS.length],
    music: {
      root: 48 + (h % 14),
      mode: (['major', 'minor', 'dorian'] as const)[h % 3],
      bpm: 70 + (h % 40),
      prog: [[0, 5, 3, 4], [0, 3, 5, 4], [0, 6, 5, 4], [0, 3, 0, 4]][h % 4],
      ...(raw.music && typeof raw.music === 'object' ? raw.music : {}),
    },
  }
}

async function getJson(path: string, ms: number) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}content/${path}`, { cache: 'no-cache', signal: ctrl.signal })
    return r.ok ? await r.json() : null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export async function loadContent() {
  const [p, r, s] = await Promise.all([getJson('profile.json', 4000), getJson('records.json', 4000), getJson('site.json', 4000)])

  if (p && typeof p === 'object') {
    for (const k of ['name', 'role', 'current', 'location', 'education', 'summary', 'github'] as const) {
      if (typeof p[k] === 'string') (profile as any)[k] = p[k]
    }
    if (Array.isArray(p.focus)) profile.focus = strs(p.focus)
    if (Array.isArray(p.skills)) profile.skills = strs(p.skills)
    if (p.links && typeof p.links === 'object') profile.links = { ...profile.links, ...p.links }
  }

  if (Array.isArray(r)) {
    const seen = new Set<string>()
    const list = r
      .map(normalise)
      .filter((x): x is RecordEntry => !!x && !seen.has(x.id) && !!seen.add(x.id))
    if (list.length) records.splice(0, records.length, ...list)
  }

  if (s && typeof s === 'object') {
    if (typeof s.realtimeUrl === 'string') site.realtimeUrl = s.realtimeUrl
    const loc = s.location
    if (loc && typeof loc.lat === 'number' && typeof loc.lon === 'number') profile.coords = { lat: loc.lat, lon: loc.lon }
    if (loc && typeof loc.timeZone === 'string') profile.timeZone = loc.timeZone
  }
}
