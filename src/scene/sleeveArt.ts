import * as THREE from 'three'
import type { RecordEntry } from '../content/records'
import { records } from '../content/records'

function rng(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

function drawPattern(g: CanvasRenderingContext2D, r: RecordEntry, S: number) {
  const { fg, accent, pattern } = r.sleeve
  const rand = rng(r.id)
  g.save()
  if (pattern === 'rings') {
    const cx = S * (0.55 + rand() * 0.2)
    const cy = S * 0.38
    for (let i = 9; i > 0; i--) {
      g.beginPath()
      g.arc(cx, cy, i * S * 0.045, 0, Math.PI * 2)
      g.fillStyle = i % 2 ? accent : r.sleeve.bg
      g.fill()
    }
  } else if (pattern === 'bars') {
    const n = 22
    const w = (S * 0.84) / n
    for (let i = 0; i < n; i++) {
      const h = S * (0.08 + Math.pow(rand(), 1.6) * 0.5)
      g.fillStyle = i % 5 === 0 ? accent : fg
      g.fillRect(S * 0.08 + i * w, S * 0.62 - h, w * 0.62, h)
    }
  } else if (pattern === 'grid') {
    const n = 9
    const step = (S * 0.8) / n
    for (let y = 0; y < 6; y++)
      for (let x = 0; x < n; x++) {
        const px = S * 0.1 + x * step + step / 2
        const py = S * 0.12 + y * step + step / 2
        const on = rand() < 0.22
        g.fillStyle = on ? accent : fg
        if (on) g.fillRect(px - step * 0.36, py - step * 0.36, step * 0.72, step * 0.72)
        else {
          g.beginPath()
          g.arc(px, py, step * 0.07, 0, Math.PI * 2)
          g.fill()
        }
      }
  } else if (pattern === 'wave') {
    g.lineWidth = S * 0.012
    for (let k = 0; k < 9; k++) {
      g.strokeStyle = k === 4 ? accent : fg
      g.beginPath()
      const amp = S * (0.02 + 0.06 * Math.sin((k / 8) * Math.PI))
      const freq = 2 + rand() * 2
      for (let x = 0; x <= S; x += 4) {
        const y = S * (0.14 + k * 0.05) + Math.sin((x / S) * Math.PI * freq + k * 0.6) * amp
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y)
      }
      g.stroke()
    }
  } else if (pattern === 'stripes') {
    g.beginPath()
    g.rect(0, 0, S, S * 0.66)
    g.clip()
    g.translate(S / 2, S * 0.33)
    g.rotate(-Math.PI / 5)
    for (let i = -8; i < 8; i++) {
      g.fillStyle = i % 3 === 0 ? accent : fg
      g.fillRect(i * S * 0.09, -S, S * 0.04, S * 2)
    }
  } else if (pattern === 'dots') {
    const n = 14
    const step = S / n
    for (let y = 0; y < 9; y++)
      for (let x = 0; x < n; x++) {
        const d = Math.hypot(x - n * 0.7, y - 2)
        const rad = Math.max(0, step * 0.42 - d * step * 0.035)
        if (rad < 1) continue
        g.fillStyle = d < 3 ? accent : fg
        g.beginPath()
        g.arc(x * step + step / 2, y * step + step / 2, rad, 0, Math.PI * 2)
        g.fill()
      }
  } else if (pattern === 'arc') {
    for (let i = 0; i < 5; i++) {
      g.beginPath()
      g.arc(S * 0.92, S * 0.08, S * (0.62 - i * 0.11), Math.PI * 0.5, Math.PI)
      g.lineWidth = S * 0.045
      g.strokeStyle = i === 1 ? accent : fg
      g.stroke()
    }
  }
  g.restore()
}

export function drawSleeve(r: RecordEntry, S = 512) {
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  const index = records.indexOf(r) + 1
  g.fillStyle = r.sleeve.bg
  g.fillRect(0, 0, S, S)
  drawPattern(g, r, S)

  g.fillStyle = r.sleeve.fg
  g.textBaseline = 'alphabetic'
  let size = S * 0.15
  g.font = `900 ${size}px Archivo, sans-serif`
  while (g.measureText(r.title).width > S * 0.86 && size > 20) {
    size -= 2
    g.font = `900 ${size}px Archivo, sans-serif`
  }
  g.fillText(r.title, S * 0.07, S * 0.86)

  g.font = `500 ${S * 0.036}px "Archivo Narrow", sans-serif`
  g.fillText(r.subtitle, S * 0.07, S * 0.93)

  g.font = `700 ${S * 0.034}px "Archivo Narrow", sans-serif`
  g.fillText('PORAS NAGAR', S * 0.07, S * 0.71)
  g.textAlign = 'right'
  g.fillText(`PN-${String(index).padStart(3, '0')} · ${r.year}`, S * 0.93, S * 0.71)
  return c
}

export function drawLabel(r: RecordEntry, S = 256) {
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#111'
  g.fillRect(0, 0, S, S)
  g.beginPath()
  g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2)
  g.fillStyle = r.sleeve.bg
  g.fill()
  g.fillStyle = r.sleeve.fg
  g.textAlign = 'center'
  g.font = `900 ${S * 0.11}px Archivo, sans-serif`
  g.fillText(r.title, S / 2, S * 0.36, S * 0.8)
  g.font = `500 ${S * 0.06}px "Archivo Narrow", sans-serif`
  g.fillText(`SIDE A · 33⅓ RPM`, S / 2, S * 0.74)
  g.fillText('PORAS NAGAR', S / 2, S * 0.82)
  g.beginPath()
  g.arc(S / 2, S / 2, S * 0.03, 0, Math.PI * 2)
  g.fillStyle = '#d9d4c7'
  g.fill()
  return c
}

const sleeveCache = new Map<string, THREE.CanvasTexture>()
const labelCache = new Map<string, THREE.CanvasTexture>()
const urlCache = new Map<string, string>()

const toTex = (c: HTMLCanvasElement) => {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}

export function sleeveTexture(r: RecordEntry) {
  let t = sleeveCache.get(r.id)
  if (!t) sleeveCache.set(r.id, (t = toTex(drawSleeve(r))))
  return t
}

export function labelTexture(r: RecordEntry) {
  let t = labelCache.get(r.id)
  if (!t) labelCache.set(r.id, (t = toTex(drawLabel(r))))
  return t
}

export function sleeveUrl(r: RecordEntry) {
  let u = urlCache.get(r.id)
  if (!u) urlCache.set(r.id, (u = drawSleeve(r, 256).toDataURL('image/png')))
  return u
}
