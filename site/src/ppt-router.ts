import {
  academyEraArticles,
  landingPanels,
  steleCategories,
  storyArticles,
  type AcademyEraArticle,
  type SteleCategory,
  type StoryArticle,
} from './data/ppt-content'
import { heritageSpots } from './data/heritage-data'
import {
  OVERVIEW_IMAGE_SIZE,
  overviewLayoutBySpotId,
  type HotspotLayout,
} from './overview-layout'
import type { HeritageSpot } from './types'

export type SpotWithLayout = HeritageSpot & {
  layout: HotspotLayout
}

export type DisplayFrame = {
  stageWidth: number
  stageHeight: number
  left: number
  top: number
  width: number
  height: number
}

export type HotspotGeometry = {
  left: number
  top: number
  width: number
  height: number
  points: string
}

export type AppRoute =
  | { page: 'landing' }
  | { page: 'overview' }
  | { page: 'guide' }
  | { page: 'stories' }
  | { page: 'story'; storyId: string }
  | { page: 'academy' }
  | { page: 'era'; eraId: string }
  | { page: 'steles' }
  | { page: 'stele'; categoryId: string }
  | { page: 'visit'; routeId?: string }
  | { page: 'spot'; spotId: string }

export type NavKey = 'home' | 'overview' | 'guide' | 'stories' | 'culture' | 'visit'

export type SpotLookup = Map<string, SpotWithLayout>
export type StoryLookup = Map<string, StoryArticle>
export type AcademyLookup = Map<string, AcademyEraArticle>
export type SteleLookup = Map<string, SteleCategory>

export const HOTSPOT_HIT_PADDING_MIN = 14
export const HOTSPOT_HIT_PADDING_MAX = 26
export const OVERVIEW_IMAGE_SRC = '/landing/overview.jpg'
export const GUIDE_LANDING_PROMPT =
  '请像真正迎客的园林导游一样，在百泉湖古建筑群的入口欢迎游客，并给出第一条适合入园的路线。'

export const spotsWithLayout: SpotWithLayout[] = heritageSpots
  .map((spot) => {
    const layout = overviewLayoutBySpotId[spot.id]

    if (!layout) {
      return null
    }

    return {
      ...spot,
      layout,
    }
  })
  .filter((spot): spot is SpotWithLayout => spot !== null)
  .sort((left, right) => left.order - right.order)

export const spotById: SpotLookup = new Map(
  spotsWithLayout.map((spot) => [spot.id, spot]),
)
export const storyById: StoryLookup = new Map(
  storyArticles.map((article) => [article.id, article]),
)
export const academyById: AcademyLookup = new Map(
  academyEraArticles.map((article) => [article.id, article]),
)
export const steleById: SteleLookup = new Map(
  steleCategories.map((category) => [category.id, category]),
)

export const headerNavItems: Array<{
  id: NavKey
  label: string
  path: string
}> = [
  { id: 'home', label: '首页', path: '/' },
  { id: 'overview', label: '地图总览', path: '/overview' },
  { id: 'guide', label: '智能导览', path: '/guide' },
  { id: 'stories', label: '鸾翔凤集', path: '/stories' },
  { id: 'culture', label: '文脉流长', path: '/academy' },
  { id: 'visit', label: '预约到访', path: '/visit' },
]

export function formatOrder(value: number) {
  return String(value).padStart(2, '0')
}

export function splitIntoParagraphs(text: string) {
  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length > 1) {
    return paragraphs
  }

  const sentences = text
    .split(/(?<=[.!?。！？])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  const grouped: string[] = []

  for (let index = 0; index < sentences.length; index += 2) {
    grouped.push(sentences.slice(index, index + 2).join(''))
  }

  return grouped
}

export function createDisplayFrame(
  stageWidth: number,
  stageHeight: number,
): DisplayFrame {
  const scale = Math.max(
    stageWidth / OVERVIEW_IMAGE_SIZE.width,
    stageHeight / OVERVIEW_IMAGE_SIZE.height,
  )
  const width = OVERVIEW_IMAGE_SIZE.width * scale
  const height = OVERVIEW_IMAGE_SIZE.height * scale

  return {
    stageWidth,
    stageHeight,
    width,
    height,
    left: (stageWidth - width) / 2,
    top: (stageHeight - height) / 2,
  }
}

export function getSpotPath(spotId: string) {
  return `/spot/${encodeURIComponent(spotId)}`
}

export function getStoryPath(storyId: string) {
  return `/stories/${encodeURIComponent(storyId)}`
}

export function getEraPath(eraId: string) {
  return `/academy/${encodeURIComponent(eraId)}`
}

export function getStelePath(categoryId: string) {
  return `/steles/${encodeURIComponent(categoryId)}`
}

export function getPanelPath(panelId: (typeof landingPanels)[number]['id']) {
  switch (panelId) {
    case 'overview':
      return '/overview'
    case 'guide':
      return '/guide'
    case 'stories':
      return '/stories'
    case 'academy':
      return '/academy'
  }
}

function safeDecodeHashSegment(segment: string) {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

export function readRouteFromHash(): AppRoute {
  if (typeof window === 'undefined') {
    return { page: 'landing' }
  }

  const rawHash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const routePath = rawHash || '/'
  const segments = routePath
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => safeDecodeHashSegment(segment))

  if (segments.length === 0) {
    return { page: 'landing' }
  }

  const [section, segmentId] = segments

  switch (section) {
    case 'overview':
      return { page: 'overview' }
    case 'guide':
      return { page: 'guide' }
    case 'stories':
      return segmentId && storyById.has(segmentId)
        ? { page: 'story', storyId: segmentId }
        : { page: 'stories' }
    case 'academy':
    case 'culture':
      return segmentId && academyById.has(segmentId)
        ? { page: 'era', eraId: segmentId }
        : { page: 'academy' }
    case 'steles':
      return segmentId && steleById.has(segmentId)
        ? { page: 'stele', categoryId: segmentId }
        : { page: 'steles' }
    case 'visit':
      return { page: 'visit', routeId: segmentId }
    case 'spot':
      return segmentId && spotById.has(segmentId)
        ? { page: 'spot', spotId: segmentId }
        : { page: 'overview' }
    default:
      return { page: 'landing' }
  }
}

export function getActiveNav(route: AppRoute): NavKey {
  switch (route.page) {
    case 'landing':
      return 'home'
    case 'overview':
    case 'spot':
      return 'overview'
    case 'guide':
      return 'guide'
    case 'stories':
    case 'story':
      return 'stories'
    case 'academy':
    case 'era':
    case 'steles':
    case 'stele':
      return 'culture'
    case 'visit':
      return 'visit'
  }
}

export function getSiblings<T extends { id: string }>(items: T[], id: string) {
  const index = items.findIndex((item) => item.id === id)

  if (index < 0 || items.length === 0) {
    return { previous: null, next: null }
  }

  return {
    previous: items[(index - 1 + items.length) % items.length] ?? null,
    next: items[(index + 1) % items.length] ?? null,
  }
}
