import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { heritageSpots } from '../src/data/heritage-data'
import { overviewLayoutBySpotId } from '../src/overview-layout'
import { findRoute } from '../src/world/navigation'
import { isInLake, isOnWalkableRoute } from '../src/world/terrain'
import { getAtmosphere } from '../src/world/time-of-day'
import { getHorizontalMovement } from '../src/world/controls/movement'
import { scenicGraph, worldBounds, worldSpotById, worldSpots } from '../src/world/world-data'

const expectedSpotIds = heritageSpots
  .filter((spot) => overviewLayoutBySpotId[spot.id])
  .map((spot) => spot.id)
  .sort()
const worldSpotIds = worldSpots.map((spot) => spot.id).sort()

assert.deepEqual(worldSpotIds, expectedSpotIds, 'World spots must cover every mapped heritage spot')
assert.equal(new Set(worldSpotIds).size, worldSpotIds.length, 'World spot ids must be unique')

const hotspotCount = worldSpots.reduce((total, spot) => total + spot.hotspots.length, 0)
assert.ok(hotspotCount >= 5, 'The world must expose at least five cultural photo hotspots')

for (const spot of worldSpots) {
  assert.ok(spot.model.url.endsWith(`${spot.id}.glb`), `${spot.id} must use the GLB naming contract`)
  assert.ok(spot.position.every(Number.isFinite), `${spot.id} has an invalid world position`)
  assert.ok(
    Math.abs(spot.position[0]) <= worldBounds.width / 2 + 1 &&
      Math.abs(spot.position[2]) <= worldBounds.depth / 2 + 1,
    `${spot.id} is outside the declared world bounds`,
  )

  for (const hotspot of spot.hotspots) {
    assert.ok(hotspot.imageSrc.startsWith('/heritage/'), `${hotspot.id} must use a heritage image`)
    assert.ok(hotspot.label.trim().length > 0, `${hotspot.id} must have a label`)
  }

  if (spot.model.status === 'ready') {
    const modelPath = resolve('public', spot.model.url.replace(/^\//, ''))
    assert.ok(existsSync(modelPath), `${spot.id} is marked ready but ${modelPath} does not exist`)
  }
}

const nodeIds = new Set(scenicGraph.nodes.map((node) => node.id))
assert.equal(nodeIds.size, scenicGraph.nodes.length, 'Route node ids must be unique')

for (const node of scenicGraph.nodes) {
  if (!node.spotId) continue
  const spot = worldSpotById.get(node.spotId)
  assert.ok(spot, `Route node ${node.id} references a missing spot`)
  assert.ok(
    Math.hypot(node.position[0] - (spot?.position[0] ?? 0), node.position[2] - (spot?.position[2] ?? 0)) >=
      (spot?.collisionRadius ?? 0),
    `Route node ${node.id} must stop outside its building collider`,
  )
}

for (const edge of scenicGraph.edges) {
  assert.ok(nodeIds.has(edge.from), `Route edge source ${edge.from} is missing`)
  assert.ok(nodeIds.has(edge.to), `Route edge target ${edge.to} is missing`)
  assert.notEqual(edge.from, edge.to, 'Route edges cannot point to the same node')
  assert.ok(edge.distance > 0, `${edge.from} -> ${edge.to} has invalid distance`)
  assert.ok(edge.path.length >= 2, `${edge.from} -> ${edge.to} needs a path geometry`)
  for (const [x, , z] of edge.path) {
    assert.ok(
      !isInLake(x, z) || isOnWalkableRoute(x, z),
      `${edge.from} -> ${edge.to} contains an unwalkable lake point`,
    )
  }

  if (edge.kind === 'path' || edge.kind === 'steps') {
    for (let index = 1; index < edge.path.length; index += 1) {
      const [ax, , az] = edge.path[index - 1]
      const [bx, , bz] = edge.path[index]
      assert.ok(
        !isInLake((ax + bx) / 2, (az + bz) / 2),
        `${edge.from} -> ${edge.to} is a land path crossing open water`,
      )
    }
  }
}

const recommendedRoute = findRoute('gate:south', 'spot:weiyuan-temple')
assert.ok(recommendedRoute, 'The recommended route must be connected')
assert.ok((recommendedRoute?.points.length ?? 0) >= 5, 'The recommended route must follow road geometry')

const noon = getAtmosphere(12)
const dawn = getAtmosphere(6.5)
const sunset = getAtmosphere(18.5)
const midnight = getAtmosphere(0)
assert.ok(noon.sunPosition.y > 50, 'Noon sun must be high above the scene')
assert.ok(noon.sunIntensity > midnight.sunIntensity, 'Daylight must be stronger than night light')
assert.equal(dawn.phase, 'dawn', '06:30 should render the dawn atmosphere')
assert.equal(sunset.phase, 'dusk', '18:30 should render the dusk atmosphere')
assert.equal(midnight.phase, 'night', '00:00 should render the night atmosphere')
assert.ok(noon.fogNear >= 150, 'Day fog must keep nearby architecture clear')
assert.ok(midnight.waterSunStrength < noon.waterSunStrength, 'Night water reflection must stay below daylight')

const forward = getHorizontalMovement(0, 0, 1)
const backward = getHorizontalMovement(0, 0, -1)
const left = getHorizontalMovement(0, -1, 0)
const right = getHorizontalMovement(0, 1, 0)
assert.ok(forward.z < -0.99 && Math.abs(forward.x) < 0.001, 'W must move toward camera forward (-Z at yaw 0)')
assert.ok(backward.z > 0.99 && Math.abs(backward.x) < 0.001, 'S must move opposite camera forward')
assert.ok(left.x < -0.99 && Math.abs(left.z) < 0.001, 'A must strafe left')
assert.ok(right.x > 0.99 && Math.abs(right.z) < 0.001, 'D must strafe right')

console.log(
  `World validation passed: ${worldSpots.length} spots, ${hotspotCount} hotspots, ${scenicGraph.nodes.length} route nodes, ${scenicGraph.edges.length} walkable edges.`,
)
