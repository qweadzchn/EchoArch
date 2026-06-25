import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Detailed, useGLTF } from '@react-three/drei'
import {
  BufferGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  type Group,
} from 'three'
import { getTerrainHeight, isInLake } from '../terrain'
import { getAtmosphere } from '../time-of-day'
import { worldSpotById } from '../world-data'
import type { WorldArchetype, WorldSpotDefinition } from '../types'

const materials = {
  roof: new MeshStandardMaterial({ color: '#415b51', roughness: 0.76, metalness: 0.015 }),
  roofDark: new MeshStandardMaterial({ color: '#34483f', roughness: 0.8 }),
  roofEdge: new MeshStandardMaterial({ color: '#988363', roughness: 0.82 }),
  timber: new MeshStandardMaterial({ color: '#71372f', roughness: 0.78 }),
  timberDark: new MeshStandardMaterial({ color: '#4f221f', roughness: 0.78 }),
  wall: new MeshStandardMaterial({ color: '#d8c9a7', roughness: 0.9 }),
  stone: new MeshStandardMaterial({ color: '#89877b', roughness: 0.96 }),
  window: new MeshStandardMaterial({
    color: '#789c96',
    roughness: 0.55,
    metalness: 0.02,
    emissive: '#f0a45e',
    emissiveIntensity: 0,
  }),
  plaque: new MeshStandardMaterial({ color: '#35281c', roughness: 0.8 }),
  plaqueBlue: new MeshStandardMaterial({ color: '#315f78', roughness: 0.76 }),
}

const illuminatedSpotIds = [
  'weiyuan-temple',
  'qinghui-pavilion',
  'south-hall',
  'qianlong-palace',
  'yongjin-pavilion',
  'huxin-pavilion',
] as const

export function ArchitectureLighting({ hour }: { hour: number }) {
  const atmosphere = useMemo(() => getAtmosphere(hour), [hour])

  useEffect(() => {
    materials.window.emissiveIntensity = atmosphere.artificialLight * 0.82
    materials.window.color.set(atmosphere.artificialLight > 0.2 ? '#8f7155' : '#789c96')
    materials.window.needsUpdate = true
  }, [atmosphere])

  if (atmosphere.artificialLight <= 0.08) return null

  return (
    <group>
      {illuminatedSpotIds.map((spotId, index) => {
        const spot = worldSpotById.get(spotId)
        if (!spot) return null
        const baseY = isInLake(spot.position[0], spot.position[2])
          ? 0.42
          : getTerrainHeight(spot.position[0], spot.position[2])
        return (
          <pointLight
            key={spotId}
            position={[
              spot.position[0] + (index % 2 ? 1.4 : -1.4),
              baseY + (spot.archetype === 'tower' ? 5.1 : 3.3),
              spot.position[2] + 2.3,
            ]}
            color="#ffc07a"
            intensity={atmosphere.artificialLight * (spot.archetype === 'tower' ? 5.2 : 3.8)}
            distance={spot.archetype === 'tower' ? 14 : 10}
            decay={2}
          />
        )
      })}
    </group>
  )
}

function HippedRoof({ width, depth, height, y, double = false }: {
  width: number
  depth: number
  height: number
  y: number
  double?: boolean
}) {
  const geometry = useMemo(() => {
    const next = new BufferGeometry()
    const vertices = [
      -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1,
      -0.44, 1, 0, 0.44, 1, 0,
    ]
    next.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    next.setIndex([
      0, 1, 5, 0, 5, 4,
      3, 4, 5, 3, 5, 2,
      0, 4, 3,
      1, 2, 5,
    ])
    next.computeVertexNormals()
    return next
  }, [])

  return (
    <group position={[0, y, 0]}>
      <mesh geometry={geometry} scale={[width / 2, height, depth / 2]} material={materials.roof} castShadow />
      <mesh position={[0, 0.02, 0]} material={materials.roofEdge} castShadow>
        <boxGeometry args={[width * 1.045, 0.13, depth * 1.045]} />
      </mesh>
      <mesh position={[0, height + 0.04, 0]} rotation={[0, 0, Math.PI / 2]} material={materials.roofEdge} castShadow>
        <cylinderGeometry args={[0.075, 0.075, width * 0.48, 8]} />
      </mesh>
      {[-0.72, -0.36, 0, 0.36, 0.72].map((ratio) => (
        <mesh key={ratio} position={[ratio * width * 0.5, height * 0.48, depth * 0.22]} rotation={[Math.PI / 2.8, 0, 0]} material={materials.roofEdge}>
          <cylinderGeometry args={[0.025, 0.025, depth * 0.94, 6]} />
        </mesh>
      ))}
      {double ? (
        <group position={[0, height * 0.9, 0]} scale={0.68}>
          <mesh geometry={geometry} scale={[width / 2, height * 0.72, depth / 2]} material={materials.roofDark} castShadow />
          <mesh position={[0, 0.01, 0]} material={materials.roofEdge}>
            <boxGeometry args={[width * 1.04, 0.12, depth * 1.04]} />
          </mesh>
        </group>
      ) : null}
    </group>
  )
}

function Columns({ width, depth, height, count = 4 }: { width: number; depth: number; height: number; count?: number }) {
  const positions = useMemo(() => {
    const next: Array<[number, number]> = []
    for (let index = 0; index < count; index += 1) {
      const x = -width / 2 + (width * index) / Math.max(1, count - 1)
      next.push([x, -depth / 2], [x, depth / 2])
    }
    return next
  }, [count, depth, width])

  return positions.map(([x, z]) => (
    <mesh key={`${x}-${z}`} position={[x, height / 2, z]} material={materials.timber} castShadow>
      <cylinderGeometry args={[0.13, 0.16, height, 10]} />
    </mesh>
  ))
}

function Steps({ width, z }: { width: number; z: number }) {
  return (
    <group position={[0, 0, z]}>
      {[0, 1, 2].map((step) => (
        <mesh key={step} position={[0, 0.09 + step * 0.11, step * 0.28]} material={materials.stone} receiveShadow>
          <boxGeometry args={[width - step * 0.35, 0.18, 0.52]} />
        </mesh>
      ))}
    </group>
  )
}

function LatticeWindow({ x, z, rotation = 0 }: { x: number; z: number; rotation?: number }) {
  return (
    <group position={[x, 1.75, z]} rotation={[0, rotation, 0]}>
      <mesh material={materials.window}>
        <boxGeometry args={[1.05, 1.2, 0.08]} />
      </mesh>
      {[-0.36, 0, 0.36].map((offset) => (
        <mesh key={offset} position={[offset, 0, 0.06]} material={materials.timberDark}>
          <boxGeometry args={[0.055, 1.22, 0.055]} />
        </mesh>
      ))}
    </group>
  )
}

function HallModel({ temple = false, compact = false }: { temple?: boolean; compact?: boolean }) {
  const width = compact ? 6.2 : temple ? 10.2 : 8
  const depth = compact ? 4.2 : temple ? 6.2 : 5
  return (
    <group>
      <mesh position={[0, 0.28, 0]} material={materials.stone} receiveShadow castShadow>
        <boxGeometry args={[width + 1.4, 0.56, depth + 1.4]} />
      </mesh>
      <Steps width={width * 0.62} z={depth / 2 + 0.85} />
      <mesh position={[0, 1.75, 0]} material={materials.wall} castShadow receiveShadow>
        <boxGeometry args={[width, 2.95, depth]} />
      </mesh>
      <mesh position={[0, 1.7, depth / 2 + 0.07]} material={materials.timber}>
        <boxGeometry args={[width * 0.34, 2.25, 0.14]} />
      </mesh>
      <Columns width={width * 0.92} depth={depth * 0.92} height={3.45} count={temple ? 6 : 5} />
      <LatticeWindow x={-width * 0.31} z={depth / 2 + 0.08} />
      <LatticeWindow x={width * 0.31} z={depth / 2 + 0.08} />
      <mesh position={[0, 3.15, depth / 2 + 0.23]} material={materials.plaque}>
        <boxGeometry args={[2.25, 0.52, 0.12]} />
      </mesh>
      <HippedRoof width={width + 2.4} depth={depth + 2.2} height={1.25} y={3.55} double={temple} />
      {temple ? (
        <group position={[0, 0, -8.4]} scale={0.78}>
          <HallModel compact />
        </group>
      ) : null}
    </group>
  )
}

function TowerModel() {
  return (
    <group>
      <mesh position={[0, 0.34, 0]} material={materials.stone} receiveShadow castShadow>
        <boxGeometry args={[10.8, 0.68, 7.4]} />
      </mesh>
      <Steps width={4.8} z={4.05} />
      {[-4.6, 4.6].map((x) => (
        <group key={x} position={[x, 0.9, 0]}>
          {[-2.9, 2.9].map((z) => (
            <mesh key={z} position={[0, 0.38, z]} material={materials.stone}>
              <boxGeometry args={[0.18, 0.92, 0.18]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, 1.8, 0]} material={materials.wall} castShadow receiveShadow>
        <boxGeometry args={[8.3, 2.85, 5.2]} />
      </mesh>
      <Columns width={7.8} depth={4.8} height={3.25} count={5} />
      <LatticeWindow x={-2.4} z={2.66} />
      <LatticeWindow x={2.4} z={2.66} />
      <HippedRoof width={10.4} depth={7.2} height={1.22} y={3.35} />
      <group position={[0, 3.65, 0]}>
        <mesh position={[0, 1.25, 0]} material={materials.timberDark} castShadow>
          <boxGeometry args={[6.3, 2.45, 4.1]} />
        </mesh>
        <Columns width={5.9} depth={3.7} height={2.75} count={4} />
        <LatticeWindow x={-1.75} z={2.11} />
        <LatticeWindow x={1.75} z={2.11} />
        <mesh position={[0, 2.25, 2.25]} material={materials.plaque}>
          <boxGeometry args={[2.1, 0.48, 0.12]} />
        </mesh>
        <HippedRoof width={8.6} depth={6.2} height={1.35} y={2.7} />
      </group>
    </group>
  )
}

function PavilionModel() {
  return (
    <group>
      <mesh position={[0, 0.24, 0]} material={materials.stone} receiveShadow castShadow>
        <cylinderGeometry args={[2.3, 2.55, 0.48, 8]} />
      </mesh>
      <Steps width={2.8} z={2.55} />
      <group position={[0, 0.47, 0]}>
        <Columns width={3.1} depth={3.1} height={3.45} />
        <mesh position={[0, 3.08, 0]} material={materials.timber}>
          <boxGeometry args={[3.7, 0.18, 3.7]} />
        </mesh>
        <HippedRoof width={5.4} depth={5.4} height={1.38} y={3.2} double />
      </group>
    </group>
  )
}

function BridgeModel() {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} material={materials.stone} receiveShadow castShadow>
        <boxGeometry args={[14, 0.55, 2.5]} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 1, side * 1.15]}>
          <mesh material={materials.stone}>
            <boxGeometry args={[14, 0.12, 0.12]} />
          </mesh>
          {[-6, -4, -2, 0, 2, 4, 6].map((x) => (
            <mesh key={x} position={[x, -0.25, 0]} material={materials.stone}>
              <boxGeometry args={[0.12, 0.8, 0.12]} />
            </mesh>
          ))}
        </group>
      ))}
      {[-4.7, 0, 4.7].map((x) => (
        <group key={x} position={[x, 0.68, 0]} scale={0.54}>
          <PavilionModel />
        </group>
      ))}
    </group>
  )
}

function CorridorModel() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]} material={materials.stone} receiveShadow>
        <boxGeometry args={[15, 0.4, 3.5]} />
      </mesh>
      <Columns width={13.5} depth={2.6} height={3.1} count={7} />
      <HippedRoof width={16.2} depth={5.2} height={1.05} y={3.05} />
    </group>
  )
}

function StoneModel() {
  return (
    <group>
      <mesh position={[0, 0.18, 0]} material={materials.stone} receiveShadow>
        <cylinderGeometry args={[1.8, 2.15, 0.36, 10]} />
      </mesh>
      <mesh position={[0, 1.85, 0]} rotation={[0.2, 0.4, -0.08]} material={materials.stone} castShadow>
        <dodecahedronGeometry args={[1.7, 1]} />
      </mesh>
    </group>
  )
}

function TombModel() {
  return (
    <group>
      <mesh position={[0, 0.3, 0]} material={materials.stone} receiveShadow>
        <cylinderGeometry args={[2.4, 2.8, 0.6, 16]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} scale={[1.3, 0.8, 1.3]} material={materials.stone} castShadow>
        <sphereGeometry args={[1.45, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 1.45, 2.1]} material={materials.stone} castShadow>
        <boxGeometry args={[0.25, 2.5, 1.35]} />
      </mesh>
    </group>
  )
}

function ParametricModel({ archetype, low = false }: { archetype: WorldArchetype; low?: boolean }) {
  if (low) return <HallModel compact />
  switch (archetype) {
    case 'temple': return <HallModel temple />
    case 'hall': return <HallModel />
    case 'tower': return <TowerModel />
    case 'bridge': return <BridgeModel />
    case 'corridor': return <CorridorModel />
    case 'stone': return <StoneModel />
    case 'tomb': return <TombModel />
    case 'shrine': return <HallModel compact />
    default: return <PavilionModel />
  }
}

function GlbSpotModel({ definition }: { definition: WorldSpotDefinition }) {
  const gltf = useGLTF(definition.model.url)
  return <primitive object={gltf.scene.clone()} />
}

export function HeritageBuilding({ definition, isSelected, onSelect }: {
  definition: WorldSpotDefinition
  isSelected: boolean
  onSelect: () => void
}) {
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const baseY = isInLake(definition.position[0], definition.position[2])
    ? 0.42
    : getTerrainHeight(definition.position[0], definition.position[2])

  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.traverse((object) => {
      if ('isMesh' in object) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })
  }, [])

  return (
    <group
      ref={groupRef}
      position={[definition.position[0], baseY, definition.position[2]]}
      rotation={definition.rotation}
      scale={definition.scale.map((value) => value * (isSelected || hovered ? 1.025 : 1)) as [number, number, number]}
      onPointerDown={(event) => { event.stopPropagation(); onSelect() }}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = '' }}
    >
      {definition.model.status === 'ready' ? (
        <Suspense fallback={<ParametricModel archetype={definition.archetype} />}>
          <GlbSpotModel definition={definition} />
        </Suspense>
      ) : (
        <Detailed distances={[0, 70]}>
          <ParametricModel archetype={definition.archetype} />
          <ParametricModel archetype={definition.archetype} low />
        </Detailed>
      )}
      {definition.id === 'weiyuan-temple' ? (
        <mesh position={[0, 3.16, 3.38]} material={materials.plaqueBlue}>
          <boxGeometry args={[2.4, 0.56, 0.08]} />
        </mesh>
      ) : null}
      <mesh position={[0, 0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[definition.collisionRadius + 0.3, definition.collisionRadius + 0.52, 48]} />
        <meshBasicMaterial color={isSelected ? definition.accent : '#d2b77e'} transparent opacity={isSelected ? 0.92 : hovered ? 0.48 : 0.08} />
      </mesh>
    </group>
  )
}
