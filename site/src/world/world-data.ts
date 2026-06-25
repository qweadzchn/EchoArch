import { heritageSpots } from '../data/heritage-data'
import { OVERVIEW_IMAGE_SIZE, overviewLayoutBySpotId } from '../overview-layout'
import type {
  RouteEdge,
  RouteNode,
  ScenicCategory,
  ScenicGraph,
  WorldArchetype,
  WorldSpotDefinition,
} from './types'

// The source overview is treated as a surveyed visual anchor. One world unit is one metre.
const WORLD_WIDTH = 180
const WORLD_DEPTH = 126

const archetypeBySpotId: Record<string, WorldArchetype> = {
  'weiyuan-temple': 'temple',
  'yongjin-pavilion': 'pavilion',
  'qinghui-pavilion': 'tower',
  'south-hall': 'hall',
  'qianlong-palace': 'temple',
  'fangyu-pavilion': 'pavilion',
  'huxin-pavilion': 'pavilion',
  'diaoyu-pavilion': 'pavilion',
  'feishi-stone': 'stone',
  'yuejin-pavilion': 'bridge',
  'boat-house': 'hall',
  'shao-shrine': 'shrine',
  anlewo: 'shrine',
  'stele-corridor': 'corridor',
  'efu-tomb': 'tomb',
}

const categoryByArchetype: Record<WorldArchetype, ScenicCategory> = {
  temple: 'building',
  hall: 'building',
  tower: 'building',
  pavilion: 'pavilion',
  bridge: 'pavilion',
  corridor: 'building',
  shrine: 'building',
  stone: 'service',
  tomb: 'service',
}

const uniformScaleByArchetype: Record<WorldArchetype, number> = {
  temple: 1.05,
  hall: 0.96,
  tower: 0.94,
  pavilion: 0.84,
  bridge: 0.92,
  corridor: 0.88,
  shrine: 0.86,
  stone: 0.72,
  tomb: 0.78,
}

const collisionRadiusByArchetype: Record<WorldArchetype, number> = {
  temple: 9.2,
  hall: 5.2,
  tower: 6.4,
  pavilion: 2.8,
  bridge: 1.8,
  corridor: 6.4,
  shrine: 4.7,
  stone: 2.2,
  tomb: 3.2,
}

const approachOffsetBySpotId: Record<string, [number, number, number]> = {
  'weiyuan-temple': [0, 0, -10],
  'yongjin-pavilion': [0, 0, 4.2],
  'qinghui-pavilion': [7, 0, 0],
  'south-hall': [0, 0, 7],
  'qianlong-palace': [-11, 0, 0],
  'fangyu-pavilion': [-4, 0, 0],
  'huxin-pavilion': [0, 0, 4],
  'diaoyu-pavilion': [0, 0, -4],
  'feishi-stone': [3, 0, 0],
  'yuejin-pavilion': [0, 0, -3],
  'boat-house': [7, 0, 0],
  'shao-shrine': [0, 0, 6],
  anlewo: [0, 0, -7],
  'stele-corridor': [0, 0, -7],
  'efu-tomb': [4, 0, 0],
}

const hotspotOffsets = [
  [-2.2, 5.4, 1.7],
  [2.4, 4.1, -0.6],
  [0.3, 6.2, -2.2],
] as const

const guideScriptBySpotId: Record<string, string> = {
  'weiyuan-temple': '卫源庙依苏门山势坐北朝南，是湖山格局的点睛之处；进殿前先看层层中轴与青瓦红木。',
  'yongjin-pavilion': '涌金亭因泉涌映日如金而得名，苏轼题名的文脉也由此留在百泉。',
  'qinghui-pavilion': '清晖阁位于湖中偏西南，是百泉水景的视觉中心；双层水阁与石桥共同构成临水层次。',
  'south-hall': '南大厅承接百泉书院旧址的讲学记忆，空间从园林游赏转向书院文脉。',
  'qianlong-palace': '乾隆行宫由百泉书院改建，建筑尺度与院落秩序更接近宫廷式布局。',
  'fangyu-pavilion': '放鱼亭临近东岸，以短桥连接岸边，与南面的钓鱼亭隔水相望。',
  'huxin-pavilion': '湖心亭是北湖中央的纪念性节点，沿桥行走时最适合回望两岸建筑。',
  'diaoyu-pavilion': '钓鱼亭位于南侧水面，体量轻巧，是南北亭榭对景的重要一环。',
  'feishi-stone': '飞石靠近南湖步道，先观察石体纹理，再看它与周边亭桥的尺度对比。',
  'yuejin-pavilion': '跃进亭是三连顶亭式廊桥，既承担通行，也延续百泉湖的水利与观景功能。',
  'boat-house': '船房处在清晖阁南侧，是由岸入湖心建筑群的重要前置节点。',
  'shao-shrine': '邵夫子祠位于湖西岸，祭祀邵雍，也把园林游线引向理学文化空间。',
  anlewo: '安乐窝与邵雍读书研易的记忆相连，地势由湖岸逐渐转向山坳。',
  'stele-corridor': '碑廊依苏门山势分级展开，参观时适合放慢脚步辨认碑刻年代与书体。',
  'efu-tomb': '鄂夫墓处在东侧山地节点，路线由平缓湖岸转为较安静的山林空间。',
}

function toWorldPosition(spotId: string): [number, number, number] {
  const layout = overviewLayoutBySpotId[spotId]

  if (!layout) {
    return [0, 0, 0]
  }

  const centerX = layout.x + layout.width / 2
  const centerY = layout.y + layout.height / 2

  return [
    (centerX / OVERVIEW_IMAGE_SIZE.width - 0.5) * WORLD_WIDTH,
    0,
    (centerY / OVERVIEW_IMAGE_SIZE.height - 0.5) * WORLD_DEPTH,
  ]
}

export const worldSpots: WorldSpotDefinition[] = heritageSpots
  .filter((spot) => overviewLayoutBySpotId[spot.id])
  .map((spot, index) => {
    const archetype = archetypeBySpotId[spot.id] ?? 'pavilion'
    const uniformScale = uniformScaleByArchetype[archetype]

    return {
      id: spot.id,
      name: spot.name,
      category: categoryByArchetype[archetype],
      region: spot.region,
      accent: spot.accent,
      position: toWorldPosition(spot.id),
      rotation: [0, ((index % 5) - 2) * 0.055, 0] as [number, number, number],
      scale: [uniformScale, uniformScale, uniformScale] as [number, number, number],
      archetype,
      modelType: archetype,
      description: spot.description,
      guideScript: guideScriptBySpotId[spot.id] ?? spot.description,
      guideTriggerRadius: archetype === 'temple' || archetype === 'tower' ? 11 : 8,
      images: spot.images.map((image) => image.src),
      model: {
        url: `/models/heritage/${spot.id}.glb`,
        status: 'planned' as const,
      },
      collisionRadius: collisionRadiusByArchetype[archetype] * uniformScale,
      labelHeight: (archetype === 'temple' ? 8.5 : archetype === 'tower' ? 8.3 : archetype === 'hall' ? 7 : 5.5) * uniformScale,
      hotspots: spot.images.slice(0, 3).map((image, imageIndex) => ({
        id: image.id,
        label: image.caption,
        description: `${spot.name}实景档案的第 ${imageIndex + 1} 个观察位置。`,
        imageSrc: image.src,
        imageAlt: image.alt,
        offset: hotspotOffsets[imageIndex] ?? hotspotOffsets[0],
      })),
    }
  })
  .sort((left, right) => {
    const leftSpot = heritageSpots.find((spot) => spot.id === left.id)
    const rightSpot = heritageSpots.find((spot) => spot.id === right.id)
    return (leftSpot?.order ?? 0) - (rightSpot?.order ?? 0)
  })

export const worldSpotById = new Map(worldSpots.map((spot) => [spot.id, spot]))

function spotNode(spotId: string): RouteNode {
  const spot = worldSpotById.get(spotId)
  if (!spot) {
    throw new Error(`Unknown scenic spot: ${spotId}`)
  }

  const offset = approachOffsetBySpotId[spotId] ?? [0, 0, spot.collisionRadius + 1.5]
  return {
    id: `spot:${spotId}`,
    name: spot.name,
    position: [
      spot.position[0] + offset[0],
      spot.position[1] + offset[1],
      spot.position[2] + offset[2],
    ],
    spotId,
  }
}

const junctionNodes: RouteNode[] = [
  { id: 'gate:south', name: '南入口', position: [51, 0, 58] },
  { id: 'junction:south', name: '南岸步道', position: [22, 0, 45] },
  { id: 'junction:west', name: '西岸步道', position: [-55, 0, 18] },
  { id: 'junction:north', name: '北岸步道', position: [-18, 0, -17] },
  { id: 'junction:east', name: '东岸步道', position: [39, 0, 12] },
  { id: 'bridge:central-south', name: '湖心南桥', position: [-3, 0, 21] },
  { id: 'bridge:central-north', name: '湖心北桥', position: [-2, 0, 10] },
  { id: 'bridge:qinghui', name: '清晖阁石桥', position: [-24, 0, 20] },
]

const routeNodes: RouteNode[] = [
  ...junctionNodes,
  ...worldSpots.map((spot) => spotNode(spot.id)),
]

function lengthOf(points: [number, number, number][]) {
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const [ax, , az] = points[index - 1]
    const [bx, , bz] = points[index]
    total += Math.hypot(bx - ax, bz - az)
  }
  return total
}

function edge(
  from: string,
  to: string,
  kind: RouteEdge['kind'],
  via: [number, number, number][] = [],
): RouteEdge {
  const fromNode = routeNodes.find((node) => node.id === from)
  const toNode = routeNodes.find((node) => node.id === to)
  if (!fromNode || !toNode) {
    throw new Error(`Invalid route edge: ${from} -> ${to}`)
  }

  const path = [[...fromNode.position], ...via, [...toNode.position]] as [number, number, number][]
  const distance = Math.round(lengthOf(path))
  return {
    from,
    to,
    distance,
    estimatedMinutes: Math.max(1, Math.ceil(distance / 72)),
    walkable: true,
    kind,
    path,
  }
}

const routeEdges: RouteEdge[] = [
  edge('gate:south', 'spot:south-hall', 'path', [[50, 0, 50]]),
  edge('spot:south-hall', 'spot:qianlong-palace', 'path', [[60, 0, 34], [69, 0, 18]]),
  edge('spot:south-hall', 'junction:south', 'path', [[37, 0, 44]]),
  edge('junction:south', 'spot:feishi-stone', 'boardwalk', [[10, 0, 42], [0, 0, 38]]),
  edge('spot:feishi-stone', 'spot:diaoyu-pavilion', 'boardwalk'),
  edge('spot:diaoyu-pavilion', 'bridge:central-south', 'boardwalk'),
  edge('bridge:central-south', 'bridge:central-north', 'bridge'),
  edge('bridge:central-north', 'spot:huxin-pavilion', 'bridge'),
  edge('spot:huxin-pavilion', 'junction:north', 'boardwalk', [[-4, 0, 2], [-10, 0, -4]]),
  edge('junction:north', 'spot:yongjin-pavilion', 'boardwalk'),
  edge('spot:yongjin-pavilion', 'spot:weiyuan-temple', 'boardwalk', [[-25, 0, -10]]),
  edge('spot:weiyuan-temple', 'spot:anlewo', 'steps', [[-40, 0, -22], [-47, 0, -22]]),
  edge('spot:anlewo', 'spot:shao-shrine', 'path', [[-62, 0, -8]]),
  edge('spot:shao-shrine', 'junction:west', 'path', [[-66, 0, 8]]),
  edge('junction:west', 'spot:boat-house', 'boardwalk', [[-62, 0, 23]]),
  edge('spot:boat-house', 'spot:yuejin-pavilion', 'bridge', [[-54, 0, 35], [-48, 0, 43]]),
  edge('spot:boat-house', 'bridge:qinghui', 'bridge', [[-49, 0, 23], [-35, 0, 21]]),
  edge('bridge:qinghui', 'spot:qinghui-pavilion', 'bridge'),
  edge('spot:qinghui-pavilion', 'spot:huxin-pavilion', 'boardwalk', [[-22, 0, 12], [-12, 0, 7]]),
  edge('junction:north', 'spot:stele-corridor', 'path', [[2, 0, -15], [14, 0, -13]]),
  edge('spot:stele-corridor', 'spot:efu-tomb', 'steps', [[29, 0, -9]]),
  edge('spot:stele-corridor', 'junction:east', 'path', [[35, 0, -8], [39, 0, 2]]),
  edge('junction:east', 'spot:fangyu-pavilion', 'boardwalk'),
  edge('junction:east', 'spot:qianlong-palace', 'path', [[48, 0, 8], [62, 0, 5]]),
  edge('junction:east', 'bridge:central-north', 'bridge', [[20, 0, 12], [8, 0, 11]]),
]

export const scenicGraph: ScenicGraph = {
  nodes: routeNodes,
  edges: routeEdges,
}

export const routeNodeById = new Map(routeNodes.map((node) => [node.id, node]))

export const recommendedRouteSpotIds = [
  'south-hall',
  'diaoyu-pavilion',
  'huxin-pavilion',
  'yongjin-pavilion',
  'weiyuan-temple',
] as const

export const worldBounds = {
  width: WORLD_WIDTH,
  depth: WORLD_DEPTH,
  minX: -WORLD_WIDTH / 2,
  maxX: WORLD_WIDTH / 2,
  minZ: -WORLD_DEPTH / 2,
  maxZ: WORLD_DEPTH / 2,
}
