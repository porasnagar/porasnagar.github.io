import { useGLTF } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { audio } from '../audio/engine'
import { localClock } from '../live/feeds'
import { startStop, toggleLid, start as startDeck } from '../state/deck'
import { useStore, type Input } from '../state/store'
import { damp } from './interact'
import { ARM, INPUT_ANGLE, LID_OPEN } from './layout'
import { Disc } from './Disc'
import { NoteBoard } from './NoteBoard'
import { ReceiverScreen } from './ReceiverScreen'
import { Sleeves } from './Sleeves'
import { useDaylight } from './useDaylight'
import { meter, spinRef } from './shared'

const URL = '/models/room.glb'
useGLTF.preload(URL)

type HotId =
  | 'turntable' | 'lid' | 'start' | 'speed33' | 'speed45' | 'arm'
  | 'receiver' | 'knob_input' | 'knob_volume' | 'power'
  | 'records' | 'speaker' | 'board' | 'sign_records' | 'sign_about' | 'sign_notes'
  | 'lamp' | 'window' | 'poster'

const NODE_TO_HOT: Record<string, HotId> = {
  tt_lid: 'lid', tt_btn_start: 'start', tt_btn_33: 'speed33', tt_btn_45: 'speed45', tt_arm: 'arm', turntable: 'turntable',
  rx_knob_input: 'knob_input', rx_knob_volume: 'knob_volume', rx_btn_power: 'power', receiver: 'receiver',
  credenza: 'records', ledge_0: 'records', ledge_1: 'records', crate: 'records',
  speaker_l: 'speaker', speaker_r: 'speaker',
  board: 'board', sign_records: 'sign_records', sign_about: 'sign_about', sign_notes: 'sign_notes',
  lamp: 'lamp', window_frame: 'window', curtain_l: 'window', curtain_r: 'window', poster: 'poster',
}

const HIFI_PARTS = new Set<HotId>(['turntable', 'lid', 'start', 'speed33', 'speed45', 'arm', 'receiver', 'knob_input', 'knob_volume', 'power', 'records', 'speaker'])

export const HOT_LABEL: Record<HotId, string> = {
  turntable: 'Turntable', lid: 'Dust cover', start: 'Start / stop', speed33: '33⅓ RPM', speed45: '45 RPM', arm: 'Tonearm',
  receiver: 'Receiver — read the screen', knob_input: 'Input selector', knob_volume: 'Volume (scroll)', power: 'Power',
  records: 'Records', speaker: 'Speaker', board: 'Guestbook', sign_records: 'Records', sign_about: 'About me',
  sign_notes: 'Guestbook', lamp: 'Lamp', window: 'Window', poster: 'About me',
}

const INPUTS: Input[] = ['PHONO', 'TUNER', 'AUX', 'TAPE']

function resolve(obj: THREE.Object3D | null): HotId | null {
  while (obj) {
    const h = NODE_TO_HOT[obj.name]
    if (h) return h
    obj = obj.parent
  }
  return null
}

function act(id: HotId) {
  const s = useStore.getState()
  if (s.view === 'room' && HIFI_PARTS.has(id)) {
    audio.unlock()
    if (id === 'receiver' || id === 'knob_input' || id === 'knob_volume' || id === 'power') s.setView('screen')
    else s.setView('hifi')
    return
  }
  switch (id) {
    case 'turntable':
    case 'records':
    case 'speaker':
    case 'sign_records':
      s.setView('hifi')
      break
    case 'receiver':
      s.setView('screen')
      break
    case 'lid':
      toggleLid()
      break
    case 'start':
      if (s.phase === 'playing' || s.phase === 'paused') startStop()
      else s.set({ input: 'PHONO' })
      press('tt_btn_start')
      audio.click('button')
      break
    case 'speed33':
    case 'speed45': {
      const sp = id === 'speed33' ? 33 : 45
      if (s.speed !== sp) {
        s.set({ speed: sp })
        audio.setSpeed(sp)
      }
      audio.click('button')
      press(id === 'speed33' ? 'tt_btn_33' : 'tt_btn_45')
      break
    }
    case 'arm':
      if (s.phase === 'playing') startStop()
      else if (s.phase === 'paused') void startDeck()
      break
    case 'knob_input': {
      const i = INPUTS.indexOf(s.input)
      s.set({ input: INPUTS[(i + 1) % INPUTS.length], power: true })
      audio.click('knob')
      break
    }
    case 'knob_volume': {
      const v = s.volume >= 0.99 ? 0.25 : Math.min(1, s.volume + 0.15)
      s.set({ volume: v })
      audio.setVolume(v)
      audio.click('knob')
      break
    }
    case 'power':
      s.set({ power: !s.power })
      audio.click('button')
      press('rx_btn_power')
      if (s.power && s.phase === 'playing') startStop()
      break
    case 'board':
    case 'sign_notes':
      s.set({ view: 'board' })
      break
    case 'sign_about':
    case 'poster':
      s.set({ view: 'screen', input: 'AUX', power: true })
      break
    case 'lamp':
      s.set({ lampOn: !s.lampOn })
      audio.click('button')
      break
    case 'window':
      s.setView(s.view === 'window' ? 'room' : 'window')
      break
  }
}

const pressed: Record<string, number> = {}
function press(name: string) {
  pressed[name] = performance.now()
}

export function Room() {
  const { scene, nodes, materials } = useGLTF(URL) as unknown as {
    scene: THREE.Group
    nodes: Record<string, THREE.Object3D>
    materials: Record<string, THREE.MeshStandardMaterial>
  }
  const { daylight } = useDaylight()

  const base = useMemo(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mat = m.material as THREE.MeshStandardMaterial
      const noShadow = ['glass_smoke', 'fairy', 'bulb', 'screen', 'vu_face', 'led', 'rug', 'rug_border', 'wire'].includes(mat.name)
      m.castShadow = !noShadow
      m.receiveShadow = true
    })
    for (const [name, metal, rough] of [['silver', 0.45, 0.38], ['silver_dark', 0.4, 0.45], ['brass', 0.5, 0.35]] as const) {
      const m = materials[name]
      if (m) {
        m.metalness = metal
        m.roughness = rough
      }
    }
    const glass = materials['glass_smoke']
    if (glass) {
      glass.transparent = true
      glass.depthWrite = false
      glass.opacity = 0.28
      glass.roughness = 0.05
    }
    const shadeMesh = nodes['lamp_shade'] as THREE.Mesh | undefined
    let shade: THREE.MeshStandardMaterial | null = null
    if (shadeMesh?.isMesh) {
      shade = (shadeMesh.material as THREE.MeshStandardMaterial).clone()
      shade.emissive = new THREE.Color('#ffc983')
      shade.emissiveIntensity = 0
      shadeMesh.material = shade
    }
    scene.updateMatrixWorld(true)
    const snap = (n: string) => {
      const o = nodes[n]
      return o ? { o, pos: o.position.clone(), rot: o.rotation.clone(), scale: o.scale.clone() } : null
    }
    const platterWorld = new THREE.Vector3()
    nodes['tt_platter']?.getWorldPosition(platterWorld)
    const screenWorld = new THREE.Vector3()
    nodes['rx_screen']?.getWorldPosition(screenWorld)
    return {
      arm: snap('tt_arm'),
      lid: snap('tt_lid'),
      platter: snap('tt_platter'),
      knobIn: snap('rx_knob_input'),
      knobVol: snap('rx_knob_volume'),
      vuL: snap('rx_vu_l_needle'),
      vuR: snap('rx_vu_r_needle'),
      wooferL: snap('spk_l_woofer'),
      wooferR: snap('spk_r_woofer'),
      hour: snap('clock_hour'),
      min: snap('clock_min'),
      buttons: ['tt_btn_start', 'tt_btn_33', 'tt_btn_45', 'rx_btn_power'].map((n) => [n, snap(n)] as const),
      platterWorld,
      screenWorld,
      shade,
    }
  }, [scene, nodes, materials])

  const st = useRef({ arm: ARM.rest, lift: 0, lid: 0, spinV: 0, spin: 0, knobIn: 0, knobVol: 0, vuL: 0, vuR: 0, playStart: 0 })
  const hovered = useStore((s) => s.hovered)

  useFrame((state, dt) => {
    const s = useStore.getState()
    const k = st.current
    const raw = s.phase === 'playing' && s.power ? audio.level() : 0
    meter.level = damp(meter.level, Math.min(1, raw * 5), 18, dt)

    // deck
    const playing = s.phase === 'playing'
    if (s.phase === 'cueing' && k.playStart === 0) k.playStart = state.clock.elapsedTime
    if (s.phase === 'empty' || s.phase === 'unloading' || s.phase === 'loading') k.playStart = 0
    const prog = k.playStart ? Math.min(1, (state.clock.elapsedTime - k.playStart) / 900) : 0
    const armTarget = s.phase === 'cueing' || playing ? ARM.start + (ARM.end - ARM.start) * prog : ARM.rest
    const liftTarget = playing ? 0 : s.phase === 'cueing' || s.phase === 'unloading' ? ARM.lift : s.loaded && s.phase === 'paused' ? ARM.lift : 0
    k.arm = damp(k.arm, armTarget, 3.2, dt)
    k.lift = damp(k.lift, liftTarget, 8, dt)
    if (base.arm) {
      base.arm.o.rotation.y = base.arm.rot.y + k.arm
      base.arm.o.position.y = base.arm.pos.y + k.lift
    }
    k.lid = damp(k.lid, s.lidOpen ? LID_OPEN : 0, 4, dt)
    if (base.lid) base.lid.o.rotation.x = base.lid.rot.x + k.lid

    const rpm = s.speed === 45 ? 45 : 33.33
    const spinTarget = playing && s.power ? (rpm / 60) * Math.PI * 2 : 0
    k.spinV = damp(k.spinV, spinTarget, playing ? 2.2 : 1.1, dt)
    k.spin -= k.spinV * dt
    if (base.platter) base.platter.o.rotation.y = base.platter.rot.y + k.spin
    spinRef.angle = k.spin

    const now = performance.now()
    for (const [n, b] of base.buttons) {
      if (!b) continue
      const t = (now - (pressed[n] ?? -1e9)) / 180
      const depth = t >= 0 && t < 1 ? Math.sin(t * Math.PI) * 0.004 : 0
      if (n === 'rx_btn_power') b.o.position.z = b.pos.z - depth
      else b.o.position.y = b.pos.y - depth
    }

    // receiver
    const inAngle = THREE.MathUtils.degToRad(INPUT_ANGLE[s.input])
    k.knobIn = damp(k.knobIn, -inAngle, 10, dt)
    if (base.knobIn) base.knobIn.o.rotation.z = base.knobIn.rot.z + k.knobIn
    k.knobVol = damp(k.knobVol, -THREE.MathUtils.degToRad(-135 + 270 * s.volume), 10, dt)
    if (base.knobVol) base.knobVol.o.rotation.z = base.knobVol.rot.z + k.knobVol
    const wob = Math.sin(state.clock.elapsedTime * 13) * 0.04
    const lv = s.power ? meter.level : 0
    k.vuL = damp(k.vuL, lv + wob * lv, 14, dt)
    k.vuR = damp(k.vuR, lv - wob * lv, 12, dt)
    if (base.vuL) base.vuL.o.rotation.z = base.vuL.rot.z - THREE.MathUtils.degToRad(-50 + 100 * Math.min(1, k.vuL))
    if (base.vuR) base.vuR.o.rotation.z = base.vuR.rot.z - THREE.MathUtils.degToRad(-50 + 100 * Math.min(1, k.vuR))
    for (const w of [base.wooferL, base.wooferR]) if (w) w.o.scale.z = w.scale.z * (1 + meter.level * 0.6)

    const led = materials['led']
    if (led) led.emissiveIntensity = s.power ? 3 : 0
    const vu = materials['vu_face']
    if (vu) vu.emissiveIntensity = s.power ? 0.9 : 0
    const screen = materials['screen']
    if (screen) screen.emissiveIntensity = s.power ? 1 : 0
  })

  // slow things: clock + light materials
  useFrame(() => {
    const [h, m] = localClock().split(':').map(Number)
    if (base.hour) base.hour.o.rotation.z = base.hour.rot.z - ((h % 12) + m / 60) * (Math.PI / 6)
    if (base.min) base.min.o.rotation.z = base.min.rot.z - m * (Math.PI / 30)
    const night = 1 - daylight
    const fairy = materials['fairy']
    if (fairy) fairy.emissiveIntensity = 0.6 + night * 5
    const lampOn = useStore.getState().lampOn
    const bulb = materials['bulb']
    if (bulb) bulb.emissiveIntensity = lampOn ? 2 + night * 6 : 0
    if (base.shade) base.shade.emissiveIntensity = lampOn ? 0.12 + night * 0.8 : 0
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    const id = resolve(e.object)
    e.stopPropagation()
    if (useStore.getState().hovered !== id) useStore.getState().set({ hovered: id })
    document.body.style.cursor = id ? 'pointer' : ''
  }
  const onOut = () => {
    useStore.getState().set({ hovered: null })
    document.body.style.cursor = ''
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    const id = resolve(e.object)
    if (!id) return
    e.stopPropagation()
    audio.unlock()
    act(id)
  }
  const onWheel = (e: ThreeEvent<WheelEvent>) => {
    const id = resolve(e.object)
    const s = useStore.getState()
    if (id === 'knob_volume' && s.view !== 'room') {
      const v = THREE.MathUtils.clamp(s.volume - Math.sign(e.deltaY) * 0.05, 0, 1)
      s.set({ volume: v })
      audio.setVolume(v)
      audio.click('knob')
    } else if (id === 'knob_input' && s.view !== 'room') {
      const i = INPUTS.indexOf(s.input) + (e.deltaY > 0 ? 1 : -1)
      s.set({ input: INPUTS[(i + INPUTS.length) % INPUTS.length] })
      audio.click('knob')
    }
  }

  useHoverLift(nodes, hovered)

  return (
    <>
      <primitive object={scene} onPointerMove={onOver} onPointerOut={onOut} onClick={onClick} onWheel={onWheel} />
      <Sleeves />
      <Disc platter={base.platterWorld} />
      <ReceiverScreen at={base.screenWorld} />
      <Suspense fallback={null}>
        <NoteBoard />
      </Suspense>
    </>
  )
}

const LIFT: Partial<Record<HotId, { node: string; axis: 'x' | 'y' | 'z'; amount: number }>> = {
  sign_records: { node: 'sign_records', axis: 'x', amount: 0.02 },
  sign_about: { node: 'sign_about', axis: 'x', amount: 0.02 },
  sign_notes: { node: 'sign_notes', axis: 'x', amount: 0.02 },
  poster: { node: 'poster', axis: 'z', amount: 0.015 },
  board: { node: 'board', axis: 'x', amount: 0.012 },
}

function useHoverLift(nodes: Record<string, THREE.Object3D>, hovered: string | null) {
  const origin = useRef<Record<string, number>>({})
  useFrame((_, dt) => {
    for (const [id, spec] of Object.entries(LIFT)) {
      const o = nodes[spec!.node]
      if (!o) continue
      const key = spec!.node
      if (origin.current[key] === undefined) origin.current[key] = o.position[spec!.axis]
      const target = origin.current[key] + (hovered === id ? spec!.amount : 0)
      o.position[spec!.axis] = damp(o.position[spec!.axis], target, 12, dt)
    }
  })
}
