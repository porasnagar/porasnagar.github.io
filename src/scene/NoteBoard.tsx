import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { ago } from '../live/feeds'
import { useStore, type Note } from '../state/store'
import { FONTS } from './fonts'
import { damp } from './interact'

const PAPER = ['#f6efdf', '#f7e3a1', '#d9e7ef', '#f2d4c9', '#e3ecd2']
const SURFACE_X = -3 + 0.053
const CENTER = { y: 1.72, z: -1.25 }

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function Card({ note, slot }: { note: Note; slot: number }) {
  const ref = useRef<THREE.Group>(null)
  const h = hash(note.id)
  const col = slot % 3
  const row = Math.floor(slot / 3)
  const z = CENTER.z + (1 - col) * 0.45 + ((h % 7) - 3) * 0.006
  const y = CENTER.y + (1 - row) * 0.285 + ((h % 5) - 2) * 0.006
  const tilt = (((h >> 3) % 9) - 4) * 0.018
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    g.scale.setScalar(damp(g.scale.x, 1, 8, dt))
  })
  return (
    <group ref={ref} position={[SURFACE_X + 0.004, y, z]} rotation={[0, Math.PI / 2, tilt]} scale={0.01}>
      <mesh receiveShadow>
        <planeGeometry args={[0.36, 0.25]} />
        <meshStandardMaterial color={PAPER[h % PAPER.length]} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.105, 0.008]} castShadow>
        <sphereGeometry args={[0.009, 12, 8]} />
        <meshStandardMaterial color="#c0392b" roughness={0.4} />
      </mesh>
      <Text
        font={FONTS.narrow}
        fontSize={0.024}
        lineHeight={1.2}
        maxWidth={0.31}
        color="#2a211b"
        anchorX="left"
        anchorY="top"
        position={[-0.155, 0.085, 0.002]}
      >
        {note.text}
      </Text>
      <Text font={FONTS.narrowBold} fontSize={0.019} color="#6b5444" anchorX="left" anchorY="bottom" position={[-0.155, -0.105, 0.002]}>
        {`— ${note.name} · ${ago(note.at)}`}
      </Text>
    </group>
  )
}

export function NoteBoard() {
  const notes = useStore((s) => s.notes)
  const status = useStore((s) => s.rtStatus)
  const latest = notes.slice(-9).reverse()
  return (
    <group>
      {latest.map((n, i) => (
        <Card key={n.id} note={n} slot={i} />
      ))}
      {latest.length === 0 && (
        <group position={[SURFACE_X + 0.004, CENTER.y, CENTER.z]} rotation={[0, Math.PI / 2, 0.02]}>
          <mesh>
            <planeGeometry args={[0.5, 0.26]} />
            <meshStandardMaterial color="#f6efdf" roughness={0.95} />
          </mesh>
          <Text font={FONTS.narrow} fontSize={0.028} maxWidth={0.44} lineHeight={1.25} color="#2a211b" anchorX="center" anchorY="middle" position={[0, 0, 0.002]}>
            {status === 'connecting' ? 'Fetching notes…' : 'No notes yet. Pin the first one from the Guestbook.'}
          </Text>
        </group>
      )}
    </group>
  )
}
