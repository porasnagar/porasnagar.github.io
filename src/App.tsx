import { useEffect, useState } from 'react'
import { audio } from './audio/engine'
import { loadContent } from './content/load'
import { startFeeds } from './live/feeds'
import { rt } from './realtime/client'
import { Scene } from './scene/Scene'
import { useStore } from './state/store'
import { ListView } from './ui/ListView'
import { Overlay } from './ui/Overlay'
import { SceneBoundary, captured } from './ui/SceneBoundary'

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const SLOW_MS = 12_000

export default function App({ fontsReady }: { fontsReady: Promise<unknown> }) {
  const [fonts, setFonts] = useState(false)
  const [ready, setReady] = useState(false)
  const [slow, setSlow] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [gl] = useState(hasWebGL)

  useEffect(() => {
    let alive = true
    let stop = () => {}
    void Promise.all([Promise.race([fontsReady, new Promise((r) => setTimeout(r, 3000))]), loadContent()]).then(() => {
      if (!alive) return
      setFonts(true)
      rt.connect()
      stop = startFeeds()
    })
    const unlock = () => audio.unlock()
    window.addEventListener('pointerdown', unlock, { once: true })
    const unsub = useStore.subscribe((s, prev) => {
      if (s.volume !== prev.volume) audio.setVolume(s.volume)
    })
    const t = window.setTimeout(() => alive && setSlow(true), SLOW_MS)
    return () => {
      alive = false
      clearTimeout(t)
      stop()
      unsub()
    }
  }, [fontsReady])

  if (!gl || failed) {
    return (
      <div className="no-gl">
        {failed && <p className="scene-failed">The 3D room could not start ({failed}). Here is everything as a list.</p>}
        <ListView />
      </div>
    )
  }

  return (
    <>
      <div className="stage">
        {fonts && (
          <SceneBoundary onError={setFailed}>
            <Scene onReady={() => setReady(true)} />
          </SceneBoundary>
        )}
      </div>
      <div className="loader" data-done={ready}>
        <div>
          <p>Warming up the valves…</p>
          {slow && !ready && (
            <div className="loader-slow">
              <p>This is taking longer than it should.{captured.error ? ` Error: ${captured.error}` : ''}</p>
              <button onClick={() => useStore.getState().set({ listOpen: true })}>Open list view</button>
              <button onClick={() => location.reload()}>Reload</button>
            </div>
          )}
        </div>
      </div>
      <Overlay />
    </>
  )
}
