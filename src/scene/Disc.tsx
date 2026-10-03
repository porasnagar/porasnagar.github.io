import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { recordById, records } from '../content/records'
import { useStore } from '../state/store'
import { sleeveSlot } from './layout'
import { labelTexture } from './sleeveArt'
import { spinRef } from './shared'

const R = 0.149
const vinylMat = new THREE.MeshStandardMaterial({ color: '#0d0c0b', roughness: 0.32, metalness: 0.15 })
const grooveMat = new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.5 })

function grooveTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  g.fillStyle = '#0e0d0c'
  g.fillRect(0, 0, 512, 512)
  for (let r = 90; r < 254; r += 1.6) {
    g.beginPath()
    g.arc(256, 256, r, 0, Math.PI * 2)
    g.strokeStyle = `rgba(255,255,255,${0.025 + ((r * 7) % 5) * 0.006})`
    g.lineWidth = 0.6
    g.stroke()
  }
  for (const r of [130, 170, 205]) {
    g.beginPath()
    g.arc(256, 256, r, 0, Math.PI * 2)
    g.strokeStyle = 'rgba(0,0,0,0.9)'
    g.lineWidth = 2.5
    g.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function Disc({ platter }: { platter: THREE.Vector3 }) {
  const loaded = useStore((s) => s.loaded)
  const [id, setId] = useState<string | null>(loaded)
  if (loaded && loaded !== id) setId(loaded)
  const rec = recordById(id)
  const group = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const p = useRef(0)
  const groove = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: grooveTexture(), roughness: 0.35, metalness: 0.2 })
    return m
  }, [])
  const labelMat = useMemo(() => (rec ? new THREE.MeshStandardMaterial({ map: labelTexture(rec), roughness: 0.7 }) : null), [rec])
  const top = useMemo(() => platter.clone().add(new THREE.Vector3(0, 0.0275, 0)), [platter])

  useFrame((_, dt) => {
    const g = group.current
    if (!g || !rec) return
    const s = useStore.getState()
    const target = s.loaded === rec.id ? 1 : 0
    const speed = dt / 1.25
    p.current = target > p.current ? Math.min(1, p.current + speed) : Math.max(0, p.current - speed)
    if (p.current === 0 && target === 0) {
      g.visible = false
      if (s.loaded === null) setId(null)
      return
    }
    g.visible = true
    const t = ease(p.current)
    const from = sleeveSlot(records.indexOf(rec)).add(new THREE.Vector3(0, 0.09, 0.03))
    const lift = new THREE.Vector3(0, 0.12, 0.12)
    const a = from
    const b = from.clone().add(lift)
    const c = top.clone().add(new THREE.Vector3(0, 0.3, 0.05))
    const d = top
    const u = 1 - t
    g.position.set(0, 0, 0)
      .addScaledVector(a, u * u * u)
      .addScaledVector(b, 3 * u * u * t)
      .addScaledVector(c, 3 * u * t * t)
      .addScaledVector(d, t * t * t)
    g.rotation.x = (Math.PI / 2) * (1 - Math.min(1, t * 1.25))
    if (spin.current) spin.current.rotation.y = p.current >= 1 ? spinRef.angle : spin.current.rotation.y
  })

  if (!rec || !labelMat) return null
  return (
    <group ref={group} visible={false}>
      <group ref={spin}>
        <mesh castShadow receiveShadow material={vinylMat}>
          <cylinderGeometry args={[R, R, 0.0018, 96, 1]} />
        </mesh>
        <mesh position={[0, 0.0010, 0]} rotation={[-Math.PI / 2, 0, 0]} material={groove}>
          <circleGeometry args={[R - 0.001, 96]} />
        </mesh>
        <mesh position={[0, 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={labelMat}>
          <circleGeometry args={[0.05, 64]} />
        </mesh>
        <mesh position={[0, -0.001, 0]} rotation={[Math.PI / 2, 0, 0]} material={grooveMat}>
          <circleGeometry args={[R - 0.001, 64]} />
        </mesh>
      </group>
    </group>
  )
}
