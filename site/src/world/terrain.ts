import { MathUtils, Vector2 } from 'three'
import { scenicGraph, worldBounds, worldSpots } from './world-data'

export type LakePolygon = {
  id: string
  points: [number, number][]
}

// Two connected historic pools, simplified from the supplied overview rather than drawn as a generic circle.
export const lakePolygons: LakePolygon[] = [
  {
    id: 'north-lake',
    points: [
      [-58, -5], [-43, -12], [-20, -15], [4, -11], [25, -3], [35, 8],
      [29, 20], [12, 25], [-8, 24], [-29, 20], [-50, 12],
    ],
  },
  {
    id: 'south-lake',
    points: [
      [-58, 12], [-34, 17], [-8, 22], [21, 22], [28, 33], [19, 45],
      [-3, 52], [-30, 50], [-52, 40], [-64, 27],
    ],
  },
]

function pointInPolygon(x: number, z: number, polygon: [number, number][]) {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [xi, zi] = polygon[index]
    const [xj, zj] = polygon[previous]
    const intersects = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi
    if (intersects) inside = !inside
  }
  return inside
}

export function isInLake(x: number, z: number) {
  return lakePolygons.some((lake) => pointInPolygon(x, z, lake.points))
}

function distanceToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const abx = bx - ax
  const abz = bz - az
  const denominator = abx * abx + abz * abz
  const t = denominator === 0 ? 0 : MathUtils.clamp(((px - ax) * abx + (pz - az) * abz) / denominator, 0, 1)
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t))
}

export function isOnWalkableRoute(x: number, z: number, padding = 1.65) {
  return scenicGraph.edges.some((edge) => {
    if (!edge.walkable) return false
    for (let index = 1; index < edge.path.length; index += 1) {
      const [ax, , az] = edge.path[index - 1]
      const [bx, , bz] = edge.path[index]
      if (distanceToSegment(x, z, ax, az, bx, bz) <= padding) return true
    }
    return false
  })
}

export function getTerrainHeight(x: number, z: number) {
  const northRise = Math.max(0, (-z - 12) / 48)
  const edgeRise = Math.max(0, (Math.abs(x) - 54) / 34)
  const undulation = Math.sin(x * 0.075) * 0.55 + Math.cos(z * 0.09) * 0.42
  const hill = Math.exp(-((x + 57) ** 2 + (z + 31) ** 2) / 620) * 8.5
  return Math.max(-0.3, northRise * 8 + edgeRise * 4 + undulation + hill)
}

export function getWalkSurfaceHeight(x: number, z: number) {
  if (isInLake(x, z) && isOnWalkableRoute(x, z, 1.72)) {
    return 0.44
  }
  return getTerrainHeight(x, z)
}

const mountainColliders = [
  { x: -70, z: -38, radius: 13 },
  { x: -42, z: -48, radius: 12 },
  { x: -10, z: -49, radius: 11 },
  { x: 23, z: -46, radius: 13 },
  { x: 58, z: -39, radius: 15 },
  { x: 78, z: -20, radius: 11 },
]

export const treePlacements = Array.from({ length: 150 }, (_, index) => {
  const angle = index * 2.399963
  const ring = 22 + ((index * 19) % 63)
  const x = Math.cos(angle) * ring + Math.sin(index * 1.7) * 5
  const z = Math.sin(angle) * ring * 0.72 - 3 + Math.cos(index * 0.91) * 4
  const scale = 0.72 + (index % 7) * 0.065
  return { x, z, scale }
}).filter(({ x, z }) => {
  if (isInLake(x, z) || isOnWalkableRoute(x, z, 2.8)) return false
  if (worldSpots.some((spot) => Math.hypot(x - spot.position[0], z - spot.position[2]) < spot.collisionRadius + 2.2)) return false
  return x > worldBounds.minX + 3 && x < worldBounds.maxX - 3 && z > worldBounds.minZ + 3 && z < worldBounds.maxZ - 3
})

export function resolveWalkPosition(
  current: Vector2,
  requested: Vector2,
  playerRadius = 0.5,
) {
  const candidate = requested.clone()
  candidate.x = MathUtils.clamp(candidate.x, worldBounds.minX + 1.5, worldBounds.maxX - 1.5)
  candidate.y = MathUtils.clamp(candidate.y, worldBounds.minZ + 1.5, worldBounds.maxZ - 1.5)

  const isBlocked = (point: Vector2) => {
    const blockedByLake = isInLake(point.x, point.y) && !isOnWalkableRoute(point.x, point.y, 1.7)
    const blockedBySpot = worldSpots.some((spot) => {
      if (spot.archetype === 'bridge') return false
      return Math.hypot(point.x - spot.position[0], point.y - spot.position[2]) < spot.collisionRadius + playerRadius
    })
    const blockedByMountain = mountainColliders.some(
      (mountain) => Math.hypot(point.x - mountain.x, point.y - mountain.z) < mountain.radius + playerRadius,
    )
    const blockedByTree = treePlacements.some(
      (tree) => Math.hypot(point.x - tree.x, point.y - tree.z) < 0.5 * tree.scale + playerRadius,
    )
    return blockedByLake || blockedBySpot || blockedByMountain || blockedByTree
  }

  if (!isBlocked(candidate)) {
    return candidate
  }

  const slideX = new Vector2(candidate.x, current.y)
  const slideZ = new Vector2(current.x, candidate.y)
  const xFree = !isBlocked(slideX)
  const zFree = !isBlocked(slideZ)
  if (xFree && Math.abs(slideX.x - current.x) > 0.001) return slideX
  if (zFree && Math.abs(slideZ.y - current.y) > 0.001) return slideZ
  return current.clone()
}
