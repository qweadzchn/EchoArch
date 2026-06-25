export type SpatialViewMode = '2d' | '3d'

export type WorldNavigationMode = 'orbit' | 'walk'

export type WorldSceneVariant = 'overview' | 'detail'

export type ScenicCategory =
  | 'building'
  | 'lake'
  | 'mountain'
  | 'gate'
  | 'pavilion'
  | 'service'

export type WorldArchetype =
  | 'temple'
  | 'hall'
  | 'tower'
  | 'pavilion'
  | 'bridge'
  | 'corridor'
  | 'shrine'
  | 'stone'
  | 'tomb'

export type ScenicSpot = {
  id: string
  name: string
  category: ScenicCategory
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: [number, number, number]
  description?: string
  images?: string[]
  modelType?: WorldArchetype
  guideScript?: string
  guideTriggerRadius?: number
}

export type GuideState = {
  mode: 'idle' | 'leading' | 'explaining' | 'waiting'
  currentRouteId?: string
  currentTargetSpotId?: string
  position: [number, number, number]
  facingUser: boolean
}

export type WorldHotspot = {
  id: string
  label: string
  description: string
  imageSrc: string
  imageAlt: string
  offset: readonly [number, number, number]
}

export type WorldModelAsset = {
  url: string
  status: 'planned' | 'ready'
}

export type WorldSpotDefinition = ScenicSpot & {
  region: string
  accent: string
  rotation: [number, number, number]
  scale: [number, number, number]
  archetype: WorldArchetype
  model: WorldModelAsset
  hotspots: WorldHotspot[]
  collisionRadius: number
  labelHeight: number
}

export type RouteNode = {
  id: string
  name: string
  position: [number, number, number]
  spotId?: string
}

export type RouteEdge = {
  from: string
  to: string
  distance: number
  estimatedMinutes: number
  walkable: boolean
  kind: 'path' | 'bridge' | 'steps' | 'boardwalk'
  path: [number, number, number][]
}

export type ScenicGraph = {
  nodes: RouteNode[]
  edges: RouteEdge[]
}

export type ComputedRoute = {
  nodeIds: string[]
  points: [number, number, number][]
  distance: number
  estimatedMinutes: number
}

export type SpatialGuideContext = {
  enabled: true
  scene: WorldSceneVariant
  navigationMode: WorldNavigationMode
  focusedSpotId: string | null
  hotspotId: string | null
  hotspotLabel: string | null
}

export type WorldCameraCommand = {
  id: number
  type:
    | 'reset'
    | 'forward'
    | 'backward'
    | 'left'
    | 'right'
    | 'turn-left'
    | 'turn-right'
}

export type WorldTimeState = {
  hour: number
  isPreview: boolean
}

export type PlayerState = {
  position: [number, number, number]
  nearestSpotId: string | null
  heading: number
  isMoving: boolean
}
