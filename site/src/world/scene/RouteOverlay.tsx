import { useMemo } from 'react'
import { Html, Line } from '@react-three/drei'
import { Shape, ShapeGeometry, Vector3 } from 'three'
import { getWalkSurfaceHeight } from '../terrain'
import type { ComputedRoute, WorldNavigationMode } from '../types'

const arrowShape = new Shape()
arrowShape.moveTo(0, 0.48)
arrowShape.lineTo(-0.34, -0.02)
arrowShape.lineTo(-0.13, -0.02)
arrowShape.lineTo(-0.13, -0.46)
arrowShape.lineTo(0.13, -0.46)
arrowShape.lineTo(0.13, -0.02)
arrowShape.lineTo(0.34, -0.02)
arrowShape.closePath()
const arrowGeometry = new ShapeGeometry(arrowShape)
arrowGeometry.rotateX(-Math.PI / 2)

function GroundArrow({ start, end }: { start: Vector3; end: Vector3 }) {
  const dx = end.x - start.x
  const dz = end.z - start.z
  const yaw = Math.atan2(-dx, -dz)
  return (
    <mesh
      geometry={arrowGeometry}
      position={[(start.x + end.x) / 2, (start.y + end.y) / 2 + 0.025, (start.z + end.z) / 2]}
      rotation={[0, yaw, 0]}
      scale={0.72}
    >
      <meshStandardMaterial color="#c1a466" roughness={0.9} transparent opacity={0.62} depthWrite={false} />
    </mesh>
  )
}

export function RouteOverlay({ route, navigationMode }: {
  route: ComputedRoute | null
  navigationMode: WorldNavigationMode
}) {
  const points = useMemo(() => route?.points.map(([x, , z]) => (
    new Vector3(x, getWalkSurfaceHeight(x, z) + 0.16, z)
  )) ?? [], [route])

  const numberedPoints = useMemo(() => {
    if (!route || points.length === 0) return []
    return route.nodeIds.map((nodeId, index) => ({
      nodeId,
      point: points[Math.round(index * (points.length - 1) / Math.max(1, route.nodeIds.length - 1))],
      number: index + 1,
    }))
  }, [points, route])

  if (!route || points.length < 2) return null
  const isOverview = navigationMode === 'orbit'

  return (
    <group>
      <Line
        points={points}
        color={isOverview ? '#c4a260' : '#ad9567'}
        lineWidth={isOverview ? 1.35 : 0.72}
        dashed
        dashSize={isOverview ? 0.72 : 0.42}
        gapSize={isOverview ? 0.52 : 0.62}
        transparent
        opacity={isOverview ? 0.72 : 0.42}
      />
      {!isOverview ? points.slice(1).map((point, index) => (
        index % 2 === 0 ? <GroundArrow key={index} start={points[index]} end={point} /> : null
      )) : null}
      {isOverview ? numberedPoints.map(({ nodeId, point, number }) => (
        <Html key={nodeId} center position={[point.x, point.y + 0.42, point.z]} distanceFactor={22} zIndexRange={[28, 8]}>
          <span className="ea-route-node-number">{number}</span>
        </Html>
      )) : null}
      <mesh position={points[0]}>
        <cylinderGeometry args={[0.26, 0.26, 0.08, 12]} />
        <meshStandardMaterial color="#789b83" roughness={0.78} />
      </mesh>
      <mesh position={points[points.length - 1]}>
        <cylinderGeometry args={[0.34, 0.34, 0.12, 12]} />
        <meshStandardMaterial color="#a85040" roughness={0.72} />
      </mesh>
    </group>
  )
}
