import { motion } from 'framer-motion'
import { useState } from 'react'
import { audio } from '../audio/engine'
import { recordById } from '../content/records'
import { profile } from '../content/profile'
import { ago, localClock, sunElevation, weatherLabel } from '../live/feeds'
import { useStore } from '../state/store'
import { useNow } from './useNow'

const STATIONS = [
  { id: 'noida', label: 'Noida', freq: 91.4 },
  { id: 'github', label: 'GitHub', freq: 98.7 },
  { id: 'room', label: 'This room', freq: 104.2 },
] as const
type Station = (typeof STATIONS)[number]['id']

const pos = (f: number) => ((f - 88) / 20) * 100

export function Tuner() {
  const [station, setStation] = useState<Station>('noida')
  const current = STATIONS.find((s) => s.id === station)!
  return (
    <div className="tuner">
      <div className="dial" role="tablist" aria-label="Stations">
        <div className="dial-scale">
          {Array.from({ length: 21 }, (_, i) => (
            <span key={i} className="tick" style={{ left: `${i * 5}%` }} data-major={i % 5 === 0} />
          ))}
          {[88, 92, 96, 100, 104, 108].map((f) => (
            <span key={f} className="freq" style={{ left: `${pos(f)}%` }}>
              {f}
            </span>
          ))}
          <motion.span className="needle" animate={{ left: `${pos(current.freq)}%` }} transition={{ type: 'spring', stiffness: 120, damping: 18 }} />
        </div>
        <div className="stations">
          {STATIONS.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={s.id === station}
              style={{ left: `${pos(s.freq)}%` }}
              onClick={() => {
                audio.click('knob')
                setStation(s.id)
              }}
            >
              {s.label} <span>{s.freq.toFixed(1)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="station os-scroll">
        {station === 'noida' && <NoidaStation />}
        {station === 'github' && <GithubStation />}
        {station === 'room' && <RoomStation />}
      </div>
    </div>
  )
}

function NoidaStation() {
  const weather = useStore((s) => s.weather)
  useNow(30_000)
  const el = sunElevation()
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: profile.timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
  return (
    <div className="noida">
      <p className="big">{localClock()}</p>
      <p>{date} in {profile.location}</p>
      <p>
        {weather
          ? `${Math.round(weather.temp)}°C, ${weatherLabel(weather.code)}, cloud ${weather.cloud}%, wind ${Math.round(weather.wind)} km/h`
          : 'Weather not loaded yet.'}
      </p>
      <p className="dim">
        Sun {el > 0 ? `${Math.round(el)}° above` : `${Math.round(-el)}° below`} the horizon. With no record playing, the window shows Noida as it is
        now. Source: Open-Meteo{weather ? `, updated ${ago(weather.fetchedAt)}` : ''}.
      </p>
    </div>
  )
}

function GithubStation() {
  const events = useStore((s) => s.github)
  const error = useStore((s) => s.githubError)
  useNow(60_000)
  if (error && events.length === 0) return <p className="dim">GitHub did not answer (the public API allows 60 requests an hour per visitor). Try again later.</p>
  if (events.length === 0) return <p className="dim">Listening for public activity on github.com/{profile.github}…</p>
  return (
    <ol className="feed">
      {events.map((e) => (
        <li key={e.id}>
          <span className="when">{ago(e.at)}</span>
          <a href={`https://github.com/${profile.github}/${e.repo}`} target="_blank" rel="noreferrer">
            {e.repo}
          </a>
          <span className="what">{e.text}</span>
        </li>
      ))}
    </ol>
  )
}

function RoomStation() {
  const status = useStore((s) => s.rtStatus)
  const online = useStore((s) => s.online)
  const listening = useStore((s) => s.listening)
  const spins = useStore((s) => s.spins)
  const plays = useStore((s) => s.plays)
  useNow(20_000)
  const top = Object.entries(plays)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  if (status !== 'live')
    return (
      <p className="dim">
        The realtime server is not reachable, so this station only knows about your own visit. Notes you leave stay on this device until it is back.
      </p>
    )
  const now = Object.entries(listening).filter(([, n]) => n > 0)
  return (
    <div className="room-station">
      <p className="big">{online}</p>
      <p>{online === 1 ? 'person in the room — just you.' : 'people in the room right now.'}</p>
      {now.length > 0 && (
        <>
          <h3>On turntables now</h3>
          <ul>
            {now.map(([id, n]) => (
              <li key={id}>
                {recordById(id)?.title ?? id} — {n}
              </li>
            ))}
          </ul>
        </>
      )}
      {spins.length > 0 && (
        <>
          <h3>Recently put on by others</h3>
          <ul>
            {spins.slice(0, 5).map((s) => (
              <li key={s.at + s.record}>
                {recordById(s.record)?.title ?? s.record} · {ago(s.at)}
              </li>
            ))}
          </ul>
        </>
      )}
      {top.length > 0 && (
        <>
          <h3>Most played</h3>
          <ol>
            {top.map(([id, n]) => (
              <li key={id}>
                {recordById(id)?.title ?? id} — {n}
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
