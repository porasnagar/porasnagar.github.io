import { useStore } from './store'
import { audio } from '../audio/engine'
import { recordById } from '../content/records'
import { rt } from '../realtime/client'

let token = 0
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const get = useStore.getState
const set = (p: Parameters<ReturnType<typeof useStore.getState>['set']>[0]) => get().set(p)

const busy = () => {
  const p = get().phase
  return p === 'loading' || p === 'cueing' || p === 'unloading'
}

async function unload(my: number) {
  set({ phase: 'unloading' })
  audio.stop()
  await wait(700)
  if (my !== token) return false
  audio.click('sleeve')
  set({ loaded: null, phase: 'empty' })
  await wait(900)
  return my === token
}

export async function putOn(id: string) {
  const rec = recordById(id)
  if (!rec || busy()) return
  const s = get()
  if (!s.power) set({ power: true })
  if (s.loaded === id) {
    if (s.phase === 'paused') await start()
    set({ input: 'PHONO' })
    return
  }
  const my = ++token
  if (s.loaded) {
    if (!(await unload(my))) return
  }
  if (!get().lidOpen) {
    audio.click('lid')
    set({ lidOpen: true })
    await wait(450)
    if (my !== token) return
  }
  audio.click('sleeve')
  set({ loaded: id, phase: 'loading', input: 'PHONO', world: rec.world })
  rt.play(id)
  await wait(1350)
  if (my !== token) return
  set({ phase: 'cueing' })
  await wait(1100)
  if (my !== token) return
  audio.thump()
  set({ phase: 'playing' })
  audio.play(rec.music, rec.id, get().speed)
}

export async function start() {
  const s = get()
  if (!s.loaded || busy()) return
  if (s.phase === 'playing') return
  const rec = recordById(s.loaded)!
  const my = ++token
  audio.click('button')
  set({ phase: 'cueing' })
  await wait(900)
  if (my !== token) return
  audio.thump()
  set({ phase: 'playing' })
  audio.play(rec.music, rec.id, get().speed)
}

export function stop() {
  const s = get()
  if (s.phase !== 'playing') return
  ++token
  audio.click('button')
  audio.stop()
  set({ phase: 'paused' })
}

export function startStop() {
  const s = get()
  if (s.phase === 'playing') stop()
  else if (s.phase === 'paused') void start()
}

export async function eject() {
  const s = get()
  if (!s.loaded || busy()) return
  const my = ++token
  if (!(await unload(my))) return
  audio.click('lid')
  set({ lidOpen: false, world: 'live' })
  rt.play(null)
}

export function toggleSpeed() {
  const next = get().speed === 33 ? 45 : 33
  audio.click('button')
  audio.setSpeed(next)
  set({ speed: next })
}

export function toggleLid() {
  if (busy()) return
  audio.click('lid')
  set({ lidOpen: !get().lidOpen })
}
