// Persists { notes, plays } to a GitHub branch when GITHUB_TOKEN is set (free hosts wipe their disk on sleep),
// otherwise to a local JSON file.
import fs from 'node:fs'
import path from 'node:path'

const TOKEN = process.env.GITHUB_TOKEN
const REPO = process.env.GITHUB_REPO || 'porasnagar/porasnagar.github.io'
const BRANCH = process.env.GITHUB_BRANCH || 'realtime-state'
const FILE = process.env.GITHUB_PATH || 'state.json'
const API = process.env.GITHUB_API || 'https://api.github.com'
const DEBOUNCE_MS = Number(process.env.SAVE_DEBOUNCE_MS) || 15_000

let sha = null
let timer = null
let dirty = false
let saving = Promise.resolve()

async function gh(method, url, body) {
  const r = await fetch(`${API}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'listening-room-realtime',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = r.status === 204 ? null : await r.json().catch(() => null)
  return { status: r.status, json }
}

async function ensureBranch() {
  const ref = await gh('GET', `/repos/${REPO}/git/ref/heads/${BRANCH}`)
  if (ref.status === 200) return
  const repo = await gh('GET', `/repos/${REPO}`)
  const base = await gh('GET', `/repos/${REPO}/git/ref/heads/${repo.json?.default_branch || 'main'}`)
  if (base.status !== 200) throw new Error(`cannot read default branch (${base.status})`)
  const made = await gh('POST', `/repos/${REPO}/git/refs`, { ref: `refs/heads/${BRANCH}`, sha: base.json.object.sha })
  if (made.status !== 201) throw new Error(`cannot create branch ${BRANCH} (${made.status})`)
}

async function fetchRemote() {
  const r = await gh('GET', `/repos/${REPO}/contents/${FILE}?ref=${encodeURIComponent(BRANCH)}`)
  if (r.status === 404) return null
  if (r.status !== 200) throw new Error(`read failed (${r.status})`)
  sha = r.json.sha
  return JSON.parse(Buffer.from(r.json.content, 'base64').toString('utf8'))
}

export function createStorage({ dataDir }) {
  const localFile = path.join(dataDir, 'state.json')
  const mode = TOKEN ? 'github' : 'file'

  async function load() {
    if (mode === 'file') {
      try {
        return JSON.parse(fs.readFileSync(localFile, 'utf8'))
      } catch {
        return null
      }
    }
    try {
      await ensureBranch()
      return await fetchRemote()
    } catch (e) {
      console.error('[storage] load failed:', e.message)
      return null
    }
  }

  async function write(state) {
    const text = JSON.stringify(state, null, 1)
    if (mode === 'file') {
      fs.mkdirSync(dataDir, { recursive: true })
      fs.writeFileSync(localFile, text)
      return
    }
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await gh('PUT', `/repos/${REPO}/contents/${FILE}`, {
        message: `realtime state: ${state.notes.length} notes`,
        content: Buffer.from(text).toString('base64'),
        branch: BRANCH,
        ...(sha ? { sha } : {}),
      })
      if (r.status === 200 || r.status === 201) {
        sha = r.json.content.sha
        return
      }
      if (r.status === 409 || r.status === 422) {
        await fetchRemote().catch(() => {})
        continue
      }
      throw new Error(`write failed (${r.status})`)
    }
  }

  function flush(getState) {
    clearTimeout(timer)
    timer = null
    if (!dirty) return saving
    dirty = false
    saving = saving.then(() => write(getState())).catch((e) => {
      dirty = true
      console.error('[storage] save failed:', e.message)
    })
    return saving
  }

  function schedule(getState) {
    dirty = true
    if (!timer) timer = setTimeout(() => flush(getState), mode === 'file' ? 800 : DEBOUNCE_MS)
  }

  return { mode, load, schedule, flush }
}
