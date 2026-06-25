import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { getTerrainHeight, isInLake } from '../terrain'
import { worldSpots } from '../world-data'
import type { WorldHotspot, WorldNavigationMode, WorldSpotDefinition } from '../types'

function SpotLabel({ spot, index, selected, navigationMode, onSelect }: {
  spot: WorldSpotDefinition
  index: number
  selected: boolean
  navigationMode: WorldNavigationMode
  onSelect: () => void
}) {
  const group = useRef<Group>(null)
  const label = useRef<HTMLButtonElement>(null)
  const baseY = isInLake(spot.position[0], spot.position[2]) ? 0.42 : getTerrainHeight(spot.position[0], spot.position[2])

  useFrame(({ camera }) => {
    if (!group.current || !label.current) return
    const distance = camera.position.distanceTo(group.current.position)
    const maxDistance = navigationMode === 'walk' ? 34 : 142
    label.current.style.opacity = distance > maxDistance ? '0' : '1'
    label.current.style.pointerEvents = distance > maxDistance ? 'none' : 'auto'
  })

  return (
    <group ref={group} position={[spot.position[0], baseY + spot.labelHeight, spot.position[2]]}>
      <Html center distanceFactor={navigationMode === 'walk' ? 11 : 20} zIndexRange={[40, 10]}>
        <button
          ref={label}
          type="button"
          className={`ea-world-marker ${selected ? 'is-active' : ''}`}
          style={{ '--world-accent': spot.accent } as React.CSSProperties}
          aria-label={`聚焦${spot.name}`}
          title={spot.name}
          onClick={(event) => { event.stopPropagation(); onSelect() }}
        >
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{spot.name}</strong>
        </button>
      </Html>
    </group>
  )
}

export function SpotLabels({ selectedSpotId, navigationMode, onSelectSpot, onOpenHotspot }: {
  selectedSpotId: string | null
  navigationMode: WorldNavigationMode
  onSelectSpot: (spotId: string) => void
  onOpenHotspot: (spot: WorldSpotDefinition, hotspot: WorldHotspot) => void
}) {
  const selectedSpot = worldSpots.find((spot) => spot.id === selectedSpotId) ?? null
  return (
    <group>
      {worldSpots.map((spot, index) => (
        <SpotLabel
          key={spot.id}
          spot={spot}
          index={index}
          selected={spot.id === selectedSpotId}
          navigationMode={navigationMode}
          onSelect={() => onSelectSpot(spot.id)}
        />
      ))}
      {selectedSpot?.hotspots.map((hotspot, index) => (
        <Html
          key={hotspot.id}
          center
          position={[
            selectedSpot.position[0] + hotspot.offset[0] * selectedSpot.scale[0],
            hotspot.offset[1] * selectedSpot.scale[1],
            selectedSpot.position[2] + hotspot.offset[2] * selectedSpot.scale[2],
          ]}
          distanceFactor={13}
          zIndexRange={[60, 42]}
        >
          <button
            type="button"
            className="ea-world-hotspot"
            aria-label={`查看实景：${hotspot.label}`}
            title={hotspot.label}
            onClick={(event) => { event.stopPropagation(); onOpenHotspot(selectedSpot, hotspot) }}
          >
            <span>{index + 1}</span>
          </button>
        </Html>
      ))}
    </group>
  )
}
