import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { damp } from './interact'
import { WINDOW } from './layout'
import { useDaylight } from './useDaylight'

const DAY_BG = new THREE.Color('#d8c9b5')
const NIGHT_BG = new THREE.Color('#17120f')
const SUN_HIGH = new THREE.Color('#fff1dc')
const SUN_LOW = new THREE.Color('#ffb877')
const MOON = new THREE.Color('#9fb2e6')

export function Lights() {
  const { daylight, sunEl } = useDaylight()
  const scene = useThree((s) => s.scene)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const sun = useRef<THREE.DirectionalLight>(null)
  const fill = useRef<THREE.DirectionalLight>(null)
  const lamp = useRef<THREE.PointLight>(null)
  const rx = useRef<THREE.PointLight>(null)
  const d = useRef(daylight)

  useEffect(() => {
    if (!sun.current) return
    sun.current.target.position.set(0.9, 0, -1.2)
    sun.current.target.updateMatrixWorld()
  }, [])

  useFrame((_, dt) => {
    const s = useStore.getState()
    d.current = damp(d.current, daylight, 2, dt)
    const day = d.current
    const night = 1 - day
    const bg = (scene.background as THREE.Color) || new THREE.Color()
    bg.copy(NIGHT_BG).lerp(DAY_BG, day)
    scene.background = bg
    if (hemi.current) {
      hemi.current.intensity = 0.32 + day * 0.85
      hemi.current.color.set('#9a6f5c').lerp(new THREE.Color('#fff1e0'), day)
    }
    if (sun.current) {
      const low = THREE.MathUtils.clamp(1 - sunEl / 35, 0, 1)
      sun.current.color.copy(SUN_HIGH).lerp(SUN_LOW, low)
      if (day < 0.05) sun.current.color.copy(MOON)
      sun.current.intensity = day > 0.05 ? 0.4 + day * 3.0 : 0.22
    }
    if (fill.current) fill.current.intensity = 0.08 + day * 0.85
    if (lamp.current) lamp.current.intensity = damp(lamp.current.intensity, s.lampOn ? 3 + night * 11 : 0, 6, dt)
    if (rx.current) rx.current.intensity = s.power ? 0.15 + night * 0.5 : 0
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={['#fff1e0', '#6b4a3a', 1]} />
      <directionalLight
        ref={sun}
        position={[WINDOW.x + 2.2, 4.6, -8]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={1}
        shadow-camera-far={20}
      />
      <directionalLight ref={fill} position={[6, 7, 6]} color="#ffe9d6" />
      <pointLight ref={lamp} position={[2.35, 1.42, -1.35]} color="#ffb46a" distance={8} decay={1.4} />
      <pointLight ref={rx} position={[-0.25, 0.8, -2.35]} color="#ffb347" distance={1.2} decay={2} />
    </>
  )
}
