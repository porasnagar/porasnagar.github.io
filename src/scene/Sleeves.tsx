import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { audio } from '../audio/engine'
import { records } from '../content/records'
import { putOn } from '../state/deck'
import { useStore } from '../state/store'
import { damp } from './interact'
import { SLEEVE, SLEEVE_TILT, sleeveSlot } from './layout'
import { sleeveTexture } from './sleeveArt'

const edgeMat = new THREE.MeshStandardMaterial({ color: '#e9dfcf', roughness: 0.9 })
const backMat = new THREE.MeshStandardMaterial({ color: '#d8ccb8', roughness: 0.9 })
const geo = new THREE.BoxGeometry(SLEEVE, SLEEVE, 0.006)

function Sleeve({ index }: { index: number }) {
  const rec = records[index]
  const ref = useRef<THREE.Group>(null)
  const slot = useMemo(() => sleeveSlot(index), [index])
  const mats = useMemo(() => {
    const front = new THREE.MeshStandardMaterial({ map: sleeveTexture(rec), roughness: 0.75 })
    return [edgeMat, edgeMat, edgeMat, edgeMat, front, backMat]
  }, [rec])
  const hoverId = `sleeve:${rec.id}`

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const s = useStore.getState()
    const hovered = s.hovered === hoverId
    const out = s.loaded === rec.id
    const lift = out ? 0.07 : hovered ? 0.035 : 0
    const forward = hovered ? 0.03 : 0
    g.position.y = damp(g.position.y, slot.y + lift, 10, dt)
    g.position.z = damp(g.position.z, slot.z + forward, 10, dt)
    g.rotation.x = damp(g.rotation.x, -SLEEVE_TILT + (hovered ? 0.12 : 0), 10, dt)
  })

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (useStore.getState().hovered !== hoverId) {
      useStore.getState().set({ hovered: hoverId })
      audio.click('knob')
    }
    document.body.style.cursor = 'pointer'
  }
  const outFn = () => {
    if (useStore.getState().hovered === hoverId) useStore.getState().set({ hovered: null })
    document.body.style.cursor = ''
  }
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (e.delta > 8) return
    audio.unlock()
    const s = useStore.getState()
    if (s.view === 'room' || s.view === 'board' || s.view === 'window') s.setView('hifi')
    void putOn(rec.id)
  }

  return (
    <group ref={ref} name={`sleeve_${rec.id}`} position={slot} rotation={[-SLEEVE_TILT, 0, 0]}>
      <mesh geometry={geo} material={mats} castShadow receiveShadow onPointerMove={over} onPointerOut={outFn} onClick={click} />
    </group>
  )
}

export function Sleeves() {
  return (
    <group>
      {records.slice(0, 10).map((r, i) => (
        <Sleeve key={r.id} index={i} />
      ))}
    </group>
  )
}
