import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { VIEWS, VIEWS_PORTRAIT } from './layout'
import { orbit } from './shared'

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const pointer = useThree((s) => s.pointer)
  const view = useStore((s) => s.view)
  const pos = useRef(new THREE.Vector3(...VIEWS.room.pos).multiplyScalar(1.25))
  const target = useRef(new THREE.Vector3(...VIEWS.room.target))
  const goalPos = new THREE.Vector3()
  const goalTarget = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)

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
      dir.copy(goalPos).sub(goalTarget).applyAxisAngle(up, orbit.yaw)
      goalPos.copy(goalTarget).add(dir)
      goalPos.y += orbit.pitch * 4
      if (!portrait) {
        goalPos.x += pointer.x * 0.35
        goalPos.y += pointer.y * 0.2
      }
    } else if (view === 'hifi' && !portrait) {
      goalPos.x += pointer.x * 0.06
      goalPos.y += pointer.y * 0.04
    }
    const k = 1 - Math.exp(-3.2 * Math.min(dt, 0.05))
    pos.current.lerp(goalPos, k)
    target.current.lerp(goalTarget, k)
    camera.position.copy(pos.current)
    camera.lookAt(target.current)
  })
  return null
}
