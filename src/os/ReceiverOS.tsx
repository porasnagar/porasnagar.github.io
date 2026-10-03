import { AnimatePresence, motion } from 'framer-motion'
import { audio } from '../audio/engine'
import { localClock } from '../live/feeds'
import { useStore, type Input } from '../state/store'
import { Aux } from './AuxApp'
import { Phono } from './Phono'
import { Tape } from './Tape'
import { Tuner } from './Tuner'
import { useNow } from './useNow'

const INPUTS: Input[] = ['PHONO', 'TUNER', 'AUX', 'TAPE']

export function ReceiverOS() {
  const input = useStore((s) => s.input)
  const online = useStore((s) => s.online)
  const status = useStore((s) => s.rtStatus)
  useNow(15_000)

  return (
    <div className="os">
      <header className="os-bar">
        <nav className="os-inputs" aria-label="Receiver input">
          {INPUTS.map((i) => (
            <button
              key={i}
              className="os-input"
              aria-pressed={input === i}
              onClick={() => {
                audio.click('knob')
                useStore.getState().set({ input: i })
              }}
            >
              {i}
            </button>
          ))}
        </nav>
        <div className="os-status">
          <span className="os-live" data-status={status} title={status === 'live' ? 'Realtime connected' : 'Realtime offline'} />
          <span>{status === 'live' ? `${online} here` : status === 'local' ? 'offline' : '…'}</span>
          <span className="os-clock">{localClock()} IST</span>
        </div>
      </header>
      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={input}
          className="os-body"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.14 }}
        >
          {input === 'PHONO' && <Phono />}
          {input === 'TUNER' && <Tuner />}
          {input === 'AUX' && <Aux />}
          {input === 'TAPE' && <Tape />}
        </motion.section>
      </AnimatePresence>
    </div>
  )
}
