import { Mask, useMask } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { WorldId } from '../content/records'
import { isRainy } from '../live/feeds'
import { useStore } from '../state/store'
import { ROOM, WINDOW } from './layout'
import { useDaylight } from './useDaylight'

type MaskProps = ReturnType<typeof useMask>

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

interface SkySpec {
  top: string
  horizon: string
  sun?: { x: number; y: number; color: string; size: number }
}

function lerpColor(a: string, b: string, t: number) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t)
}

function Sky({ spec, mask }: { spec: SkySpec; mask: MaskProps }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          top: { value: new THREE.Color(spec.top) },
          horizon: { value: new THREE.Color(spec.horizon) },
          sunPos: { value: new THREE.Vector2(spec.sun?.x ?? 0, spec.sun?.y ?? -10) },
          sunColor: { value: new THREE.Color(spec.sun?.color ?? '#fff') },
          sunSize: { value: spec.sun?.size ?? 0 },
        },
        vertexShader: `varying vec2 vUv; varying vec3 vPos; void main(){ vUv = uv; vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec2 sunPos; uniform vec3 sunColor; uniform float sunSize; varying vec2 vUv; varying vec3 vPos;
          void main(){
            float t = smoothstep(0.25, 0.85, vUv.y);
            vec3 c = mix(horizon, top, t);
            float d = distance(vPos.xy, sunPos);
            c = mix(c, sunColor, smoothstep(sunSize, sunSize * 0.92, d));
            c += sunColor * 0.25 * smoothstep(sunSize * 4.0, sunSize, d);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
        depthWrite: false,
        ...mask,
      }),
    [spec.top, spec.horizon, spec.sun?.x, spec.sun?.y, spec.sun?.color, spec.sun?.size, mask],
  )
  useEffect(() => () => mat.dispose(), [mat])
  return (
    <mesh position={[0, 6, -24]} material={mat} renderOrder={-1}>
      <planeGeometry args={[80, 36]} />
    </mesh>
  )
}

function Ridge({
  seed,
  z,
  base,
  height,
  color,
  rough = 0.5,
  width = 60,
  mask,
  steps = 90,
}: {
  seed: number
  z: number
  base: number
  height: number
  color: THREE.ColorRepresentation
  rough?: number
  width?: number
  mask: MaskProps
  steps?: number
}) {
  const geo = useMemo(() => {
    const r = rng(seed)
    const phases = [r() * 6, r() * 6, r() * 6]
    const shape = new THREE.Shape()
    shape.moveTo(-width / 2, base - 20)
    for (let i = 0; i <= steps; i++) {
      const x = -width / 2 + (i / steps) * width
      const y =
        base +
        height *
          (0.55 +
            0.3 * Math.sin(x * 0.18 + phases[0]) +
            0.15 * Math.sin(x * 0.47 + phases[1]) +
            rough * 0.12 * Math.sin(x * 1.3 + phases[2]) +
            rough * 0.08 * (r() - 0.5))
      shape.lineTo(x, y)
    }
    shape.lineTo(width / 2, base - 20)
    return new THREE.ShapeGeometry(shape)
  }, [seed, base, height, rough, width, steps])
  return (
    <mesh geometry={geo} position={[0, 0, z]}>
      <meshBasicMaterial color={color} {...mask} />
    </mesh>
  )
}

const windowTex = (() => {
  let tex: THREE.CanvasTexture | null = null
  return () => {
    if (tex) return tex
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = '#000'
    g.fillRect(0, 0, 64, 128)
    const r = rng(7)
    for (let y = 4; y < 128; y += 10)
      for (let x = 4; x < 64; x += 10) {
        if (r() < 0.38) {
          g.fillStyle = r() < 0.8 ? '#ffcf7a' : '#cfe3ff'
          g.fillRect(x, y, 5, 6)
        }
      }
    tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.magFilter = THREE.NearestFilter
    return tex
  }
})()

interface SkylineProps {
  seed: number
  count: number
  zMin: number
  zMax: number
  hMin: number
  hMax: number
  color: string
  lit: number
  mask: MaskProps
  base?: number
}

function useBuildings({ seed, count, zMin, zMax, hMin, hMax }: SkylineProps) {
  return useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: count }, () => {
      const w = 1.2 + r() * 2.2
      const h = hMin + r() * (hMax - hMin)
      return { x: (r() - 0.5) * 34, z: zMin + r() * (zMax - zMin), w, h, d: 1 + r() * 2 }
    })
  }, [seed, count, zMin, zMax, hMin, hMax])
}

function LitSkyline(props: SkylineProps) {
  const { color, lit, mask, base = -8 } = props
  const items = useBuildings(props)
  const textures = useMemo(() => {
    const tex = windowTex()
    return items.map((b, i) => {
      const t = tex.clone()
      t.repeat.set(b.w / 2.4, b.h / 4.8)
      t.offset.set((i * 0.37) % 1, (i * 0.61) % 1)
      t.needsUpdate = true
      return t
    })
  }, [items])
  return (
    <group>
      {items.map((b, i) => (
        <group key={i} position={[b.x, base + b.h / 2, b.z]}>
          <mesh>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshBasicMaterial color={color} {...mask} />
          </mesh>
          {lit > 0.02 && (
            <mesh position={[0, 0, b.d / 2 + 0.01]}>
              <planeGeometry args={[b.w, b.h]} />
              <meshBasicMaterial map={textures[i]} transparent opacity={lit} blending={THREE.AdditiveBlending} depthWrite={false} {...mask} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

function Stars({ count = 400, mask, opacity = 1 }: { count?: number; mask: MaskProps; opacity?: number }) {
  const geo = useMemo(() => {
    const r = rng(11)
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * 70
      pos[i * 3 + 1] = -2 + r() * 24
      pos[i * 3 + 2] = -23
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [count])
  return (
    <points geometry={geo}>
      <pointsMaterial color="#fff6e0" size={0.09} sizeAttenuation transparent opacity={opacity} depthWrite={false} {...mask} />
    </points>
  )
}

function Clouds({ amount, color, mask, seed = 3 }: { amount: number; color: THREE.ColorRepresentation; mask: MaskProps; seed?: number }) {
  const group = useRef<THREE.Group>(null)
  const puffs = useMemo(() => {
    const r = rng(seed)
    const n = Math.round(amount * 11)
    return Array.from({ length: n }, () => ({
      x: (r() - 0.5) * 40,
      y: 3 + r() * 6,
      z: -14 - r() * 6,
      s: 0.8 + r() * 1.6,
      parts: Array.from({ length: 4 }, (_, k) => [k * 0.9 - 1.3, r() * 0.4, 0, 0.7 + r() * 0.6] as const),
    }))
  }, [amount, seed])
  useFrame((_, dt) => {
    if (!group.current) return
    for (const c of group.current.children) {
      c.position.x += dt * 0.15
      if (c.position.x > 22) c.position.x = -22
    }
  })
  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <group key={i} position={[p.x, p.y, p.z]} scale={[p.s * 1.6, p.s * 0.7, p.s]}>
          {p.parts.map((q, k) => (
            <mesh key={k} position={[q[0], q[1], q[2]]} scale={q[3]}>
              <sphereGeometry args={[1, 12, 10]} />
              <meshBasicMaterial color={color} {...mask} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function Rain({ mask, intensity = 1 }: { mask: MaskProps; intensity?: number }) {
  const ref = useRef<THREE.LineSegments>(null)
  const count = Math.round(500 * intensity)
  const geo = useMemo(() => {
    const r = rng(5)
    const pos = new Float32Array(count * 6)
    for (let i = 0; i < count; i++) {
      const x = (r() - 0.5) * 14
      const y = -4 + r() * 14
      const z = -1 - r() * 8
      pos.set([x, y, z, x - 0.04, y - 0.5, z], i * 6)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [count])
  useFrame((_, dt) => {
    const a = geo.getAttribute('position') as THREE.BufferAttribute
    const arr = a.array as Float32Array
    for (let i = 0; i < count; i++) {
      const o = i * 6
      arr[o + 1] -= dt * 9
      arr[o + 4] -= dt * 9
      if (arr[o + 4] < -4) {
        arr[o + 1] += 14
        arr[o + 4] += 14
      }
    }
    a.needsUpdate = true
  })
  return (
    <lineSegments ref={ref} geometry={geo}>
      <lineBasicMaterial color="#c9d6e8" transparent opacity={0.55} {...mask} />
    </lineSegments>
  )
}

function Sea({ color, glint, mask }: { color: string; glint: string; mask: MaskProps }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 }, base: { value: new THREE.Color(color) }, glint: { value: new THREE.Color(glint) } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float time; uniform vec3 base; uniform vec3 glint; varying vec2 vUv;
          void main(){
            float depth = vUv.y;
            float band = sin(vUv.y * 180.0 / (0.25 + depth) + time * 1.4 + sin(vUv.x * 40.0 + time) * 2.0);
            float g = smoothstep(0.92, 1.0, band) * smoothstep(0.35, 0.0, abs(vUv.x - 0.5)) * (1.0 - depth * 0.6);
            vec3 c = mix(base * 0.8, base, depth) + glint * g * 0.7;
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
        ...mask,
      }),
    [color, glint, mask],
  )
  useFrame((s) => (mat.uniforms.time.value = s.clock.elapsedTime))
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, -13]} material={mat}>
      <planeGeometry args={[80, 22]} />
    </mesh>
  )
}

function Trees({ mask, color, seed = 9, z = -6, base = -3.4 }: { mask: MaskProps; color: string; seed?: number; z?: number; base?: number }) {
  const trees = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: 34 }, () => ({ x: (r() - 0.5) * 26, z: z - r() * 5, h: 1.6 + r() * 2.4 }))
  }, [seed, z])
  return (
    <group>
      {trees.map((t, i) => (
        <mesh key={i} position={[t.x, base + t.h / 2, t.z]}>
          <coneGeometry args={[t.h * 0.28, t.h, 7]} />
          <meshBasicMaterial color={color} {...mask} />
        </mesh>
      ))}
    </group>
  )
}

function Planet({ mask }: { mask: MaskProps }) {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => ref.current && (ref.current.rotation.y += dt * 0.05))
  return (
    <group position={[2.5, 3.2, -16]} ref={ref}>
      <mesh>
        <sphereGeometry args={[2.4, 40, 30]} />
        <meshBasicMaterial color="#c97a5a" {...mask} />
      </mesh>
      <mesh position={[-0.5, 0.4, 1.2]}>
        <sphereGeometry args={[2.05, 40, 30]} />
        <meshBasicMaterial color="#e8a37a" {...mask} />
      </mesh>
      <mesh rotation={[1.25, 0.2, 0]}>
        <ringGeometry args={[3.0, 4.2, 64]} />
        <meshBasicMaterial color="#e8d3a8" side={THREE.DoubleSide} transparent opacity={0.75} {...mask} />
      </mesh>
    </group>
  )
}

function World({ id, mask }: { id: WorldId; mask: MaskProps }) {
  const { daylight, sunEl } = useDaylight()
  const weather = useStore((s) => s.weather)

  if (id === 'city')
    return (
      <>
        <Sky mask={mask} spec={{ top: '#0b1026', horizon: '#46315f', sun: { x: -6, y: 9, color: '#f3ecd6', size: 0.9 } }} />
        <Stars mask={mask} count={250} />
        <LitSkyline seed={3} count={36} zMin={-20} zMax={-14} hMin={6} hMax={16} color="#1e2236" lit={0.9} mask={mask} />
        <LitSkyline seed={8} count={26} zMin={-11} zMax={-7} hMin={4} hMax={11} color="#141726" lit={1} mask={mask} />
      </>
    )
  if (id === 'sea')
    return (
      <>
        <Sky mask={mask} spec={{ top: '#4f97c7', horizon: '#f5e6c8', sun: { x: 3, y: 0.6, color: '#fff2c6', size: 1.1 } }} />
        <Clouds amount={0.3} color="#fbf6ec" mask={mask} />
        <Sea color="#1b4965" glint="#fff2c6" mask={mask} />
      </>
    )
  if (id === 'dawn')
    return (
      <>
        <Sky mask={mask} spec={{ top: '#7d9ccc', horizon: '#f9cfa5', sun: { x: -4, y: 0.4, color: '#ffe3b0', size: 1.3 } }} />
        <Ridge seed={21} z={-20} base={-1.2} height={4.2} color="#a7a3c4" mask={mask} rough={0.8} />
        <Ridge seed={22} z={-15} base={-2.6} height={3.6} color="#7f7aa6" mask={mask} rough={0.9} />
        <Ridge seed={23} z={-10} base={-4} height={3.0} color="#585683" mask={mask} rough={1} />
        <Ridge seed={24} z={-6} base={-4.8} height={2.2} color="#3b3a5e" mask={mask} rough={1.2} />
      </>
    )
  if (id === 'desert')
    return (
      <>
        <Sky mask={mask} spec={{ top: '#e07a5f', horizon: '#f6c28b', sun: { x: 1.5, y: 1.4, color: '#fff0c8', size: 1.6 } }} />
        <Ridge seed={31} z={-19} base={-1.5} height={2.8} color="#c8835f" mask={mask} rough={0.1} steps={12} />
        <Ridge seed={32} z={-13} base={-3.2} height={2.4} color="#d79b6b" mask={mask} rough={0.2} />
        <Ridge seed={33} z={-8} base={-4.6} height={2} color="#e3b27f" mask={mask} rough={0.1} />
      </>
    )
  if (id === 'rain')
    return (
      <>
        <Sky mask={mask} spec={{ top: '#58637a', horizon: '#9aa1b0' }} />
        <Clouds amount={1} color="#7c8496" mask={mask} seed={4} />
        <Ridge seed={41} z={-16} base={-2.5} height={3.2} color="#58665f" mask={mask} />
        <Trees mask={mask} color="#2f4a3c" />
        <Trees mask={mask} color="#23382d" seed={12} z={-4.5} base={-4.2} />
        <Rain mask={mask} />
      </>
    )
  if (id === 'space')
    return (
      <>
        <Sky mask={mask} spec={{ top: '#05060f', horizon: '#18204a' }} />
        <Stars mask={mask} count={700} />
        <Planet mask={mask} />
      </>
    )

  // live: Noida, now
  const d = daylight
  const night = 1 - d
  const dusk = Math.max(0, 1 - Math.abs(sunEl - 2) / 10)
  const top = lerpColor('#0d1328', '#6aa6d6', d).lerp(new THREE.Color('#5b4a7a'), dusk * 0.5)
  const horizon = lerpColor('#2a2846', '#e9e2cf', d).lerp(new THREE.Color('#f2a36b'), dusk * 0.7)
  const cloud = weather ? weather.cloud / 100 : 0.3
  const rainy = weather ? isRainy(weather.code) : false
  if (rainy) {
    top.lerp(new THREE.Color('#6b7486'), 0.6 * d)
    horizon.lerp(new THREE.Color('#a3a9b4'), 0.6 * d)
  }
  const sunY = THREE.MathUtils.mapLinear(sunEl, -10, 60, -3, 9)
  const moon = night > 0.5
  return (
    <>
      <Sky
        mask={mask}
        spec={{
          top: `#${top.getHexString()}`,
          horizon: `#${horizon.getHexString()}`,
          sun: moon ? { x: -5, y: 7, color: '#f1ead2', size: 0.7 } : { x: 4, y: sunY, color: '#fff3d0', size: 1.1 },
        }}
      />
      {night > 0.3 && <Stars mask={mask} count={180} opacity={night} />}
      <Clouds amount={cloud} color={lerpColor('#3b4058', rainy ? '#c9ccd3' : '#fbf7ef', d)} mask={mask} />
      <LitSkyline seed={51} count={34} zMin={-26} zMax={-19} hMin={4} hMax={11} color={`#${lerpColor('#1a1d2c', '#9c9488', d).getHexString()}`} lit={night} mask={mask} />
      <LitSkyline seed={52} count={22} zMin={-16} zMax={-12} hMin={3} hMax={7} color={`#${lerpColor('#151826', '#6f675c', d).getHexString()}`} lit={night} mask={mask} />
      {rainy && <Rain mask={mask} intensity={Math.min(1, 0.4 + (weather?.precip ?? 0) / 4)} />}
    </>
  )
}

export function Scenery() {
  const target = useStore((s) => s.world)
  const [shown, setShown] = useState<WorldId>(target)
  const cover = useRef<THREE.Mesh>(null)
  const coverMat = useRef<THREE.MeshBasicMaterial>(null)
  const fade = useRef({ v: 0, dir: 0 })
  const mask = useMask(1)

  useEffect(() => {
    if (target !== shown) fade.current.dir = 1
  }, [target, shown])

  useFrame((_, dt) => {
    const f = fade.current
    if (f.dir === 0) return
    f.v += f.dir * dt * 3
    if (f.v >= 1) {
      f.v = 1
      f.dir = -1
      setShown(useStore.getState().world)
    } else if (f.v <= 0) {
      f.v = 0
      f.dir = 0
    }
    if (coverMat.current) coverMat.current.opacity = f.v
  })

  return (
    <>
      <Mask id={1} position={[WINDOW.x, WINDOW.y, -ROOM.half - 0.02]} renderOrder={-10}>
        <planeGeometry args={[WINDOW.w, WINDOW.h]} />
      </Mask>
      <group position={[WINDOW.x, WINDOW.y - 0.4, -ROOM.half - 0.4]}>
        <World id={shown} mask={mask} />
      </group>
      <mesh ref={cover} position={[WINDOW.x, WINDOW.y, -ROOM.half - 0.1]} renderOrder={5}>
        <planeGeometry args={[WINDOW.w + 0.2, WINDOW.h + 0.2]} />
        <meshBasicMaterial ref={coverMat} color="#f3eadb" transparent opacity={0} depthWrite={false} {...mask} />
      </mesh>
    </>
  )
}
