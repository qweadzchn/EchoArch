import { scenicGraph } from './world-data'
import type { ComputedRoute, RouteEdge, ScenicGraph } from './types'

function edgeWeight(edge: RouteEdge) {
  return edge.walkable ? edge.distance : Number.POSITIVE_INFINITY
}

export function findNearestRouteNode(position: readonly [number, number, number], graph = scenicGraph) {
  let nearest = graph.nodes[0]
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const node of graph.nodes) {
    const distance = Math.hypot(node.position[0] - position[0], node.position[2] - position[2])
    if (distance < nearestDistance) {
      nearest = node
      nearestDistance = distance
    }
  }

  return nearest
}

export function findRoute(
  fromNodeId: string,
  toNodeId: string,
  graph: ScenicGraph = scenicGraph,
): ComputedRoute | null {
  if (fromNodeId === toNodeId) {
    const node = graph.nodes.find((candidate) => candidate.id === fromNodeId)
    return node
      ? { nodeIds: [node.id], points: [[...node.position]], distance: 0, estimatedMinutes: 0 }
      : null
  }

  const unvisited = new Set(graph.nodes.map((node) => node.id))
  const distances = new Map(graph.nodes.map((node) => [node.id, Number.POSITIVE_INFINITY]))
  const previous = new Map<string, { nodeId: string; edge: RouteEdge }>()
  distances.set(fromNodeId, 0)

  while (unvisited.size > 0) {
    let currentId: string | null = null
    let currentDistance = Number.POSITIVE_INFINITY

    for (const nodeId of unvisited) {
      const distance = distances.get(nodeId) ?? Number.POSITIVE_INFINITY
      if (distance < currentDistance) {
        currentId = nodeId
        currentDistance = distance
      }
    }

    if (!currentId || !Number.isFinite(currentDistance)) {
      break
    }
    if (currentId === toNodeId) {
      break
    }

    unvisited.delete(currentId)
    for (const edge of graph.edges) {
      if (!edge.walkable || (edge.from !== currentId && edge.to !== currentId)) {
        continue
      }

      const neighbor = edge.from === currentId ? edge.to : edge.from
      if (!unvisited.has(neighbor)) {
        continue
      }

      const candidate = currentDistance + edgeWeight(edge)
      if (candidate < (distances.get(neighbor) ?? Number.POSITIVE_INFINITY)) {
        distances.set(neighbor, candidate)
        previous.set(neighbor, { nodeId: currentId, edge })
      }
    }
  }

  if (!previous.has(toNodeId)) {
    return null
  }

  const nodeIds = [toNodeId]
  const routeEdges: Array<{ edge: RouteEdge; reversed: boolean }> = []
  let cursor = toNodeId

  while (cursor !== fromNodeId) {
    const step = previous.get(cursor)
    if (!step) {
      return null
    }
    routeEdges.push({ edge: step.edge, reversed: step.edge.to !== cursor })
    cursor = step.nodeId
    nodeIds.push(cursor)
  }

  nodeIds.reverse()
  routeEdges.reverse()

  const points: [number, number, number][] = []
  let distance = 0
  let estimatedMinutes = 0

  routeEdges.forEach(({ edge, reversed }, edgeIndex) => {
    const edgePoints = reversed ? [...edge.path].reverse() : edge.path
    points.push(...edgePoints.slice(edgeIndex === 0 ? 0 : 1).map((point) => [...point] as [number, number, number]))
    distance += edge.distance
    estimatedMinutes += edge.estimatedMinutes
  })

  return { nodeIds, points, distance, estimatedMinutes }
}

export function findRouteToSpot(
  fromPosition: readonly [number, number, number],
  spotId: string,
  graph = scenicGraph,
) {
  const origin = findNearestRouteNode(fromPosition, graph)
  return findRoute(origin.id, `spot:${spotId}`, graph)
}
