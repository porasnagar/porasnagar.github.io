import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ago } from '../live/feeds'
import { useNow } from '../os/useNow'
import { useStore, type Note } from '../state/store'
import { damp } from './interact'

const PAPER = ['#f6efdf', '#f7e3a1', '#d9e7ef', '#f2d4c9', '#e3ecd2']
const SURFACE_X = -3 + 0.053
const CENTER = { y: 1.72, z: -1.25 }
const W = 0.36
const H = 0.25
const PX = 512

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function wrap(g: CanvasRenderingContext2D, text: string, maxW: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (g.measureText(next).width <= maxW) line = next
    else {
      if (line) lines.push(line)
      line = word
      while (g.measureText(line).width > maxW && line.length > 1) {
        let cut = line.length - 1
        while (cut > 1 && g.measureText(line.slice(0, cut)).width > maxW) cut--
        lines.push(line.slice(0, cut))
        line = line.slice(cut)
      }
    }
  }
  if (line) lines.push(line)
  return lines
}

function paint(paper: string, body: string, footer: string) {
  const c = document.createElement('canvas')
  c.width = PX
  c.height = Math.round((PX * H) / W)
  const g = c.getContext('2d')!
  g.fillStyle = paper
  g.fillRect(0, 0, c.width, c.height)
  const pad = 30
  g.fillStyle = '#2a211b'
  g.font = '500 34px "Archivo Narrow", sans-serif'
  wrap(g, body, c.width - pad * 2)
    .slice(0, 5)
    .forEach((l, i) => g.fillText(l, pad, 82 + i * 38))
  g.fillStyle = '#6b5444'
  g.font = '700 25px "Archivo Narrow", sans-serif'
  g.fillText(footer, pad, c.height - 24, c.width - pad * 2)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

function Paper({ text, footer, seed, position, tilt, pin = true }: { text: string; footer: string; seed: number; position: [number, number, number]; tilt: number; pin?: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const tex = useMemo(() => paint(PAPER[seed % PAPER.length], text, footer), [text, footer, seed])
  useEffect(() => () => tex.dispose(), [tex])
  useFrame((_, dt) => {
    const g = ref.current
    if (g) g.scale.setScalar(damp(g.scale.x, 1, 8, dt))
  })
  return (
    <group ref={ref} position={position} rotation={[0, Math.PI / 2, tilt]} scale={0.01}>
      <mesh receiveShadow>
        <planeGeometry args={[W, H]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      {pin && (
        <mesh position={[0, H / 2 - 0.02, 0.008]} castShadow>
          <sphereGeometry args={[0.009, 12, 8]} />
          <meshStandardMaterial color="#c0392b" roughness={0.4} />
        </mesh>
      )}
    </group>
  )
}

function Card({ note, slot }: { note: Note; slot: number }) {
  const h = hash(note.id)
  const col = slot % 3
  const row = Math.floor(slot / 3)
  const z = CENTER.z + (1 - col) * 0.45 + ((h % 7) - 3) * 0.006
  const y = CENTER.y + (1 - row) * 0.285 + ((h % 5) - 2) * 0.006
  const tilt = (((h >> 3) % 9) - 4) * 0.018
  return <Paper text={note.text} footer={`— ${note.name} · ${ago(note.at)}`} seed={h} position={[SURFACE_X + 0.004, y, z]} tilt={tilt} />
}

export function NoteBoard() {
  const notes = useStore((s) => s.notes)
  const status = useStore((s) => s.rtStatus)
  useNow(60_000)
  const latest = notes.slice(-9).reverse()
  if (latest.length === 0)
    return (
      <Paper
        text={status === 'connecting' ? 'Fetching notes…' : 'No notes yet. Pin the first one from the Guestbook.'}
        footer=""
        seed={0}
        position={[SURFACE_X + 0.004, CENTER.y, CENTER.z]}
        tilt={0.02}
        pin={false}
      />
    )
  return (
    <group>
      {latest.map((n, i) => (
        <Card key={n.id} note={n} slot={i} />
      ))}
    </group>
  )
}
