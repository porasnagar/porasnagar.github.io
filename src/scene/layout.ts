import * as THREE from 'three'
import type { View } from '../state/store'

export const ROOM = { half: 3, wallH: 3.2 }
export const WINDOW = { x: 2.08, y: 1.78, w: 1.2, h: 1.4 }

export const SLEEVE = 0.31
const LEDGES = [1.76, 1.2]
const LEDGE_X = -0.45
const LEDGE_STEP = 0.46
export const SLEEVE_TILT = 0.2

export function sleeveSlot(i: number) {
  if (i >= 10) return new THREE.Vector3(-2.3, 0.3, -1.55)
  const row = Math.floor(i / 5)
  const col = i % 5
  return new THREE.Vector3(
    LEDGE_X + (col - 2) * LEDGE_STEP,
    LEDGES[row] + (SLEEVE / 2) * Math.cos(SLEEVE_TILT) + 0.002,
    -ROOM.half + 0.038,
  )
}

export const ARM = { rest: 0.12, start: -0.5, end: -0.85, lift: 0.012 }
export const LID_OPEN = -1.25
export const INPUT_ANGLE = { PHONO: -60, TUNER: -20, AUX: 20, TAPE: 60 } as const

export const SCREEN_PX = { w: 720, h: 400 }
export const SCREEN_M = { w: 0.36, h: 0.2 }

export const VIEWS: Record<View, { pos: [number, number, number]; target: [number, number, number]; fitW?: number; fitH?: number }> = {
  room: { pos: [6.0, 4.3, 6.6], target: [-0.45, 1.05, -1.1], fitW: 6.4 },
  hifi: { pos: [-0.45, 1.55, -0.4], target: [-0.45, 1.36, -2.8], fitW: 2.6, fitH: 1.85 },
  screen: { pos: [-0.18, 0.8, -2.0], target: [-0.18, 0.776, -2.56], fitW: 0.7, fitH: 0.34 },
  board: { pos: [-1.2, 1.78, -1.25], target: [-3, 1.72, -1.25], fitW: 1.7 },
  window: { pos: [1.7, 1.75, -1.0], target: [WINDOW.x, WINDOW.y, -3.4], fitW: 1.7 },
}
