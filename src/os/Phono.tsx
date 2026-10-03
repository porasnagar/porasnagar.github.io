import { recordById, records } from '../content/records'
import { eject, putOn, startStop, toggleSpeed } from '../state/deck'
import { useStore } from '../state/store'
import { sleeveUrl } from '../scene/sleeveArt'

export function Phono() {
  const loaded = useStore((s) => s.loaded)
  const phase = useStore((s) => s.phase)
  const speed = useStore((s) => s.speed)
  const plays = useStore((s) => s.plays)
  const listening = useStore((s) => s.listening)
  const rtStatus = useStore((s) => s.rtStatus)
  const rec = recordById(loaded)

  if (!rec) {
    return (
      <div className="phono-empty">
        <p className="os-lede">Nothing on the platter. Pick a sleeve from the shelves, or one from this list.</p>
        <ol className="tracklist-pick">
          {records.map((r, i) => (
            <li key={r.id}>
              <button onClick={() => void putOn(r.id)}>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <span className="t">{r.title}</span>
                <span className="s">{r.subtitle}</span>
                <span className="y">{r.year}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  const busy = phase === 'loading' || phase === 'cueing' || phase === 'unloading'
  const others = Math.max(0, (listening[rec.id] ?? 0) - (rtStatus === 'live' ? 1 : 0))
  const state =
    phase === 'loading' ? 'Loading' : phase === 'cueing' ? 'Cueing' : phase === 'playing' ? 'Playing' : phase === 'paused' ? 'Stopped' : 'Returning'

  return (
    <div className="phono">
      <aside className="phono-side">
        <img src={sleeveUrl(rec)} alt="" width={132} height={132} />
        <h2>{rec.title}</h2>
        <p className="sub">{rec.subtitle}</p>
        <p className="meta">
          {rec.year}
          {rec.status ? ` · ${rec.status}` : ''}
        </p>
        <div className="transport">
          <button onClick={startStop} disabled={busy}>
            {phase === 'playing' ? 'Stop' : 'Play'}
          </button>
          <button onClick={toggleSpeed} aria-label={`Speed ${speed} RPM, switch`}>
            {speed === 33 ? '33⅓' : '45'}
          </button>
          <button onClick={() => void eject()} disabled={busy}>
            Return
          </button>
        </div>
        <p className="meta small">
          {state} · played {plays[rec.id] ?? 0}×{others > 0 ? ` · ${others} other${others > 1 ? 's' : ''} listening` : ''}
        </p>
      </aside>
      <div className="phono-notes os-scroll">
        <section>
          <h3>Side A — {rec.sideA.label}</h3>
          <p>{rec.sideA.text}</p>
        </section>
        <section>
          <h3>Side B — {rec.sideB.label}</h3>
          <p>{rec.sideB.text}</p>
        </section>
        <section>
          <h3>Tracklist</h3>
          <ol className="tracks">
            {rec.tracks.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </section>
        <section>
          <h3>Credits</h3>
          <p className="credits">{rec.credits.join(' · ')}</p>
        </section>
        {rec.links.length > 0 && (
          <section>
            <h3>Links</h3>
            <p className="links">
              {rec.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ))}
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
