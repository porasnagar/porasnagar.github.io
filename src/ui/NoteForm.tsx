import { useState, type FormEvent } from 'react'
import { audio } from '../audio/engine'
import { rt } from '../realtime/client'

export function NoteForm({ compact = false, onSent }: { compact?: boolean; onSent?: () => void }) {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('listening-room:name') || ''
    } catch {
      return ''
    }
  })
  const [text, setText] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (t.length < 2) {
      setMsg('Write a little more.')
      return
    }
    try {
      localStorage.setItem('listening-room:name', name.trim())
    } catch {}
    audio.click('button')
    rt.note(name, t, (retryIn) => {
      setText(t)
      setMsg(`Not pinned — one note every 20 s. Try again in ${Math.ceil(retryIn / 1000)} s.`)
    })
    setText('')
    setMsg('Pinned to the board.')
    onSent?.()
  }

  return (
    <form className={compact ? 'note-form compact' : 'note-form'} onSubmit={submit}>
      <label>
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="anonymous" autoComplete="nickname" />
      </label>
      <label>
        <span>Note</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={140} rows={compact ? 3 : 2} placeholder="Say hi, or tell me which record you liked." />
      </label>
      <div className="note-actions">
        <span className="count">{text.length}/140</span>
        <button type="submit">Pin note</button>
      </div>
      {msg && (
        <p className="note-msg" role="status">
          {msg}
        </p>
      )}
    </form>
  )
}
