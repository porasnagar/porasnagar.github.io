import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { profile } from '../content/profile'
import { records } from '../content/records'
import { putOn } from '../state/deck'
import { useStore } from '../state/store'
import { sleeveUrl } from '../scene/sleeveArt'

export function ListView() {
  const close = () => useStore.getState().set({ listOpen: false })
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return (
    <motion.div
      className="list-view"
      role="dialog"
      aria-modal="true"
      aria-label="Discography"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="list-inner" ref={ref} tabIndex={-1}>
        <div className="list-head">
          <div>
            <h2>{profile.name}</h2>
            <p>
              {profile.current} · {profile.location} · {profile.education}
            </p>
          </div>
          <button onClick={close}>Close <kbd>Esc</kbd></button>
        </div>
        <p className="list-summary">{profile.summary}</p>
        <p className="list-links">
          {Object.entries(profile.links).map(([k, href]) => (
            <a key={k} href={href} target="_blank" rel="noreferrer">
              {k === 'github' ? 'GitHub' : k === 'linkedin' ? 'LinkedIn' : k[0].toUpperCase() + k.slice(1)}
            </a>
          ))}
        </p>
        <h3>Discography</h3>
        <ol className="disco">
          {records.map((r, i) => (
            <li key={r.id}>
              <img src={sleeveUrl(r)} alt="" width={88} height={88} loading="lazy" />
              <div>
                <p className="disco-title">
                  <span className="num">{String(i + 1).padStart(2, '0')}</span> {r.title}
                  <span className="disco-year">
                    {r.year}
                    {r.status ? ` · ${r.status}` : ''}
                  </span>
                </p>
                <p className="disco-sub">{r.subtitle}</p>
                <p>{r.sideA.text}</p>
                <p>{r.sideB.text}</p>
                <p className="disco-credits">{r.credits.join(' · ')}</p>
                <p className="disco-links">
                  {r.links.map((l) => (
                    <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  ))}
                  <button
                    onClick={() => {
                      close()
                      useStore.getState().setView('hifi')
                      void putOn(r.id)
                    }}
                  >
                    Put it on
                  </button>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </motion.div>
  )
}
