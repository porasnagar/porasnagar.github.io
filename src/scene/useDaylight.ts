import { useEffect, useState } from 'react'
import { sunElevation } from '../live/feeds'
import { useStore } from '../state/store'

const forced = { day: 38, night: -22 }

export function useDaylight() {
  const mode = useStore((s) => s.lightMode)
  const [real, setReal] = useState(() => sunElevation())
  useEffect(() => {
    const t = window.setInterval(() => setReal(sunElevation()), 30_000)
    return () => clearInterval(t)
  }, [])
  const sunEl = mode === 'auto' ? real : forced[mode]
  const daylight = Math.min(1, Math.max(0, (sunEl + 6) / 16))
  return { sunEl, daylight }
}
