import { create } from 'zustand'
import type { WorldId } from '../content/records'

export type View = 'room' | 'hifi' | 'screen' | 'board' | 'window'
export type Input = 'PHONO' | 'TUNER' | 'AUX' | 'TAPE'
export type DeckPhase = 'empty' | 'loading' | 'cueing' | 'playing' | 'paused' | 'unloading'
export type LightMode = 'auto' | 'day' | 'night'

export interface Note {
  id: string
  name: string
  text: string
  at: number
}

export interface Weather {
  temp: number
  code: number
  isDay: boolean
  cloud: number
  precip: number
  wind: number
  fetchedAt: number
}

export interface GhEvent {
  id: string
  type: string
  repo: string
  text: string
  at: number
}

export type RtStatus = 'connecting' | 'live' | 'local'

interface State {
  view: View
  hovered: string | null
  sound: boolean
  lightMode: LightMode
  lampOn: boolean
  listOpen: boolean

  loaded: string | null
  phase: DeckPhase
  lidOpen: boolean
  speed: 33 | 45

  power: boolean
  input: Input
  volume: number

  world: WorldId

  rtStatus: RtStatus
  online: number
  listening: Record<string, number>
  plays: Record<string, number>
  notes: Note[]
  spins: { record: string; at: number }[]

  weather: Weather | null
  github: GhEvent[]
  githubError: boolean

  set: (p: Partial<State>) => void
  setView: (v: View) => void
  setInput: (i: Input) => void
}

export const useStore = create<State>((set) => ({
  view: 'room',
  hovered: null,
  sound: true,
  lightMode: 'auto',
  lampOn: true,
  listOpen: false,

  loaded: null,
  phase: 'empty',
  lidOpen: false,
  speed: 33,

  power: true,
  input: 'AUX',
  volume: 0.7,

  world: 'live',

  rtStatus: 'connecting',
  online: 1,
  listening: {},
  plays: {},
  notes: [],
  spins: [],

  weather: null,
  github: [],
  githubError: false,

  set: (p) => set(p),
  setView: (view) => set({ view, hovered: null }),
  setInput: (input) => set({ input }),
}))
