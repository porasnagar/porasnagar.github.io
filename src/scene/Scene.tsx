import { PerformanceMonitor } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { CameraRig } from './CameraRig'
import { Lights } from './Lights'
import { Room } from './Room'
import { Scenery } from './Scenery'
import { orbit } from './shared'

const Q = new URLSearchParams(location.search)
const OFF = (k: string) => Q.get(k) === '0'

function ShadowThrottle() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
  }, [gl])
  useFrame(({ clock }) => {
    if (Math.floor(clock.elapsedTime * 8) !== Math.floor((clock.elapsedTime - 1 / 60) * 8)) gl.shadowMap.needsUpdate = true
  })
  return null
}

function DevProbe() {
  const { camera, scene, size } = useThree()
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as any).__project = (name: string, offset?: [number, number, number]) => {
      const o = scene.getObjectByName(name)
      if (!o) return null
      const v = new THREE.Vector3()
      o.getWorldPosition(v)
      if (offset) v.add(new THREE.Vector3(...offset))
      v.project(camera)
      return { x: Math.round(((v.x + 1) / 2) * size.width), y: Math.round(((1 - v.y) / 2) * size.height) }
    }
  }, [camera, scene, size])
  return null
}

function Ready({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      onReady()
    }
    const t = window.setTimeout(finish, 6000)
    try {
      gl.compileAsync(scene, camera).then(finish, finish)
    } catch {
      finish()
    }
    return () => clearTimeout(t)
  }, [gl, scene, camera, onReady])
  return null
}

export function Scene({ onReady }: { onReady: () => void }) {
  const drag = useRef<{ x: number; y: number } | null>(null)
  const [dpr, setDpr] = useState(Math.min(1.5, window.devicePixelRatio))
  return (
    <Canvas
      shadows={OFF('shadow') ? false : { type: THREE.PCFShadowMap }}
      dpr={dpr}
      camera={{ fov: 30, near: 0.05, far: 80, position: [8, 5.6, 9] }}
      gl={{ stencil: true, antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.AgXToneMapping
        gl.toneMappingExposure = 1.05
        gl.setClearColor('#17120f')
      }}
      onPointerMissed={() => useStore.getState().set({ hovered: null })}
      onPointerDown={(e) => (drag.current = { x: e.clientX, y: e.clientY })}
      onPointerMove={(e) => {
        const d = drag.current
        if (!d || e.buttons === 0 || useStore.getState().view !== 'room') return
        orbit.yaw = THREE.MathUtils.clamp(orbit.yaw - (e.clientX - d.x) * 0.005, -0.85, 0.85)
        orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + (e.clientY - d.y) * 0.003, -0.25, 0.45)
        drag.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUp={() => (drag.current = null)}
      style={{ touchAction: 'none' }}
    >
      <PerformanceMonitor
        bounds={() => [40, 58]}
        onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(Math.min(1.75, window.devicePixelRatio), d + 0.25))}
      />
      <Suspense fallback={null}>
        <Lights />
        {!OFF('scenery') && <Scenery />}
        <Room />
        <Ready onReady={onReady} />
      </Suspense>
      <CameraRig />
      <ShadowThrottle />
      {import.meta.env.DEV && <DevProbe />}
    </Canvas>
  )
}
