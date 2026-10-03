import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { VIEWS, VIEWS_PORTRAIT } from './layout'
import { hover, orbit } from './shared'

const YAW_MAX = 0.85

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const view = useStore((s) => s.view)
  const pos = useRef(new THREE.Vector3(...VIEWS.room.pos).multiplyScalar(1.25))
  const target = useRef(new THREE.Vector3(...VIEWS.room.target))
  const goalPos = new THREE.Vector3()
  const goalTarget = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  // Hover look is applied after the view lerp so it can stop dead: while the cursor is on something
  // clickable the camera holds still, otherwise the target would slide out from under the click.
  const look = useRef({ x: 0, y: 0, room: 1, hifi: 0 })

  useFrame((_, dt) => {
    const portrait = camera.aspect < 0.8
    const v = (portrait && VIEWS_PORTRAIT[view]) || VIEWS[view]
    goalTarget.set(...v.target)
    goalPos.set(...v.pos)
    if (v.fitW || v.fitH) {
      const half = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
      const needW = v.fitW ? v.fitW / 2 / (half * camera.aspect) : 0
      const needH = v.fitH ? v.fitH / 2 / half : 0
      const need = Math.max(needW, needH)
      dir.copy(goalPos).sub(goalTarget)
      if (need > dir.length()) goalPos.copy(goalTarget).addScaledVector(dir.normalize(), need)
    }
    if (view === 'room') {
      dir.copy(goalPos).sub(goalTarget).applyAxisAngle(up, orbit.yaw).multiplyScalar(orbit.zoom)
      goalPos.copy(goalTarget).add(dir)
      goalPos.y += orbit.pitch * 4
    }
    const step = Math.min(dt, 0.05)
    const k = 1 - Math.exp(-3.2 * step)
    pos.current.lerp(goalPos, k)
    target.current.lerp(goalTarget, k)

    const l = look.current
    if (useStore.getState().hovered === null) {
      const h = 1 - Math.exp(-4 * step)
      l.x += (hover.x - l.x) * h
      l.y += (hover.y - l.y) * h
    }
    l.room += ((view === 'room' ? 1 : 0) - l.room) * k
    l.hifi += ((view === 'hifi' ? 1 : 0) - l.hifi) * k
    const yaw = (THREE.MathUtils.clamp(orbit.yaw + l.x * 0.3, -YAW_MAX, YAW_MAX) - orbit.yaw) * l.room
    dir.copy(pos.current).sub(target.current).applyAxisAngle(up, yaw)
    camera.position.copy(target.current).add(dir)
    camera.position.y += (THREE.MathUtils.clamp(orbit.pitch + l.y * 0.06, -0.25, 0.45) - orbit.pitch) * 4 * l.room
    camera.position.x += l.x * 0.06 * l.hifi
    camera.position.y += l.y * 0.04 * l.hifi
    camera.lookAt(target.current)
  })
  return null
}
