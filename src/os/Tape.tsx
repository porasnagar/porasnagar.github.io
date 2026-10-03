import { useState } from 'react'
import { ago } from '../live/feeds'
import { useStore } from '../state/store'
import { NoteForm } from '../ui/NoteForm'

export function Tape() {
  const notes = useStore((s) => s.notes)
  const status = useStore((s) => s.rtStatus)
  const [recording, setRecording] = useState(false)
  const latest = notes.slice(-12).reverse()
  return (
    <div className="tape">
      <div className="tape-left">
        <div className="cassette" data-rolling={recording}>
          <span className="reel" />
          <span className="window" />
          <span className="reel" />
        </div>
        <NoteForm compact onSent={() => {
          setRecording(true)
          window.setTimeout(() => setRecording(false), 1600)
        }} />
        <p className="dim small">
          {status === 'live' ? 'Notes are public and appear on the corkboard for everyone.' : 'Offline: your note stays on this device.'}
        </p>
      </div>
      <ol className="tape-notes os-scroll">
        {latest.length === 0 && <li className="dim">No notes yet.</li>}
        {latest.map((n) => (
          <li key={n.id}>
            <p>{n.text}</p>
            <span>
              {n.name} · {ago(n.at)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
