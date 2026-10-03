import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { audio } from '../audio/engine'
import { profile } from '../content/profile'
import { recordById, records } from '../content/records'
import { localClock, weatherLabel } from '../live/feeds'
import { eject, putOn, startStop } from '../state/deck'
import { useStore, type View } from '../state/store'
import { HOT_LABEL } from '../scene/Room'
import { useNow } from '../os/useNow'
import { ListView } from './ListView'
import { NoteForm } from './NoteForm'
import { ReceiverOS } from '../os/ReceiverOS'
import { useMedia } from './useMedia'

const HINTS: Record<View, string> = {
  room: 'Click the hi-fi, a record sleeve, or a sign on the wall.',
  hifi: 'Click a sleeve to put it on. Click the receiver to read it up close.',
  screen: 'Turn the input knob or use the tabs. Scroll the screen to read.',
  board: 'Notes from visitors, live. Pin your own below.',
  window: 'With no record on, this is Noida right now.',
}

const BACK: Partial<Record<View, View>> = { hifi: 'room', screen: 'hifi', board: 'room', window: 'room' }

export function Overlay() {
  const view = useStore((s) => s.view)
  const hovered = useStore((s) => s.hovered)
  const sound = useStore((s) => s.sound)
  const lightMode = useStore((s) => s.lightMode)
  const weather = useStore((s) => s.weather)
  const online = useStore((s) => s.online)
  const status = useStore((s) => s.rtStatus)
  const listOpen = useStore((s) => s.listOpen)
  const loaded = useStore((s) => s.loaded)
  const phase = useStore((s) => s.phase)
  const power = useStore((s) => s.power)
  const narrow = useMedia('(max-width: 720px)')
  useNow(20_000)
  const tip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (tip.current) tip.current.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 16}px)`
    }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea')) return
      const s = useStore.getState()
      if (e.key === 'Escape') {
        if (s.listOpen) s.set({ listOpen: false })
        else if (BACK[s.view]) s.setView(BACK[s.view]!)
      } else if (e.key === ' ' && s.loaded) {
        e.preventDefault()
        startStop()
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const i = records.findIndex((r) => r.id === s.loaded)
        const next = records[(i + (e.key === 'ArrowRight' ? 1 : records.length - 1) + (i < 0 ? 1 : 0)) % records.length]
        audio.unlock()
        if (s.view === 'room') s.setView('hifi')
        void putOn(next.id)
      } else if (e.key.toLowerCase() === 'l') {
        s.set({ listOpen: !s.listOpen })
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  const tipLabel = hovered?.startsWith('sleeve:')
    ? (() => {
        const r = recordById(hovered.slice(7))
        return r ? `${r.title} — ${r.subtitle}` : null
      })()
    : hovered
      ? HOT_LABEL[hovered as keyof typeof HOT_LABEL]
      : null
  const rec = recordById(loaded)

  return (
    <>
      <header className="top">
        <div className="who">
          <h1>{profile.name}</h1>
          <p>
            {profile.role} · {profile.location}
          </p>
        </div>
        <div className="controls">
          <span className="live" title="Local time and weather in Noida, and visitors here now">
            <span>{localClock()} IST</span>
            {weather && (
              <span>
                {Math.round(weather.temp)}° {weatherLabel(weather.code)}
              </span>
            )}
            <span className="presence" data-status={status}>
              {status === 'live' ? `${online} here now` : status === 'local' ? 'offline' : 'connecting'}
            </span>
          </span>
          <button
            onClick={() => {
              const next = !sound
              useStore.getState().set({ sound: next })
              audio.setEnabled(next)
            }}
            aria-pressed={sound}
          >
            Sound {sound ? 'on' : 'off'}
          </button>
          <button
            onClick={() => {
              const order = ['auto', 'day', 'night'] as const
              useStore.getState().set({ lightMode: order[(order.indexOf(lightMode) + 1) % 3] })
            }}
            title="Auto follows the real sun in Noida"
          >
            Light: {lightMode}
          </button>
          <button onClick={() => useStore.getState().set({ listOpen: true })}>List view</button>
        </div>
      </header>

      <footer className="bottom">
        <AnimatePresence>
          {BACK[view] && (
            <motion.button
              key="back"
              className="back"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              onClick={() => useStore.getState().setView(BACK[view]!)}
            >
              ← Back <kbd>Esc</kbd>
            </motion.button>
          )}
        </AnimatePresence>
        <p className="hint">{view === 'window' && rec ? `Outside: the world of ${rec.title}. Return the record to see Noida now.` : HINTS[view]}</p>
        {rec && (
          <div className="now">
            <span>
              {phase === 'playing' ? 'Playing' : phase === 'paused' ? 'Stopped' : 'Cueing'}: <strong>{rec.title}</strong>
            </span>
            <button onClick={startStop}>{phase === 'playing' ? 'Stop' : 'Play'}</button>
            <button onClick={() => void eject()}>Return</button>
            {view !== 'screen' && <button onClick={() => useStore.getState().set({ view: 'screen', input: 'PHONO' })}>Read notes</button>}
          </div>
        )}
      </footer>

      <AnimatePresence>
        {view === 'board' && (
          <motion.div
            key="board"
            className="board-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
          >
            <h2>Leave a note</h2>
            <NoteForm />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {view === 'screen' && narrow && (
          <motion.div
            key="rx-mobile"
            className="rx-mobile"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
          >
            <div className="rx-screen" data-power={power ? 'on' : 'off'}>
              {power ? <ReceiverOS /> : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={tip} className="tip" data-show={!!tipLabel && !listOpen}>
        {tipLabel}
      </div>

      <AnimatePresence>{listOpen && <ListView />}</AnimatePresence>
    </>
  )
}
