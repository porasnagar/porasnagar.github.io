import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { ReceiverOS } from '../os/ReceiverOS'
import { useStore } from '../state/store'
import { SCREEN_M, SCREEN_PX } from './layout'

const DISTANCE_FACTOR = (SCREEN_M.w / SCREEN_PX.w) * 400

export function ReceiverScreen({ at }: { at: THREE.Vector3 }) {
  const view = useStore((s) => s.view)
  const power = useStore((s) => s.power)
  if (view !== 'hifi' && view !== 'screen') return null
  return (
    <Html
      transform
      position={[at.x, at.y, at.z + 0.0015]}
      distanceFactor={DISTANCE_FACTOR}
      zIndexRange={[20, 0]}
      style={{ width: SCREEN_PX.w, height: SCREEN_PX.h }}
    >
      <div className="rx-screen" data-power={power ? 'on' : 'off'}>
        {power ? <ReceiverOS /> : null}
        {view === 'hifi' && (
          <button className="rx-zoom" aria-label="Read the receiver up close" onClick={() => useStore.getState().setView('screen')} />
        )}
      </div>
    </Html>
  )
}
