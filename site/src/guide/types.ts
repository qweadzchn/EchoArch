import type { HeritageSpot } from '../types'
import type { SpatialGuideContext } from '../world/types'

export type GuideMode = 'welcome' | 'story' | 'route' | 'image' | 'ask'
export type GuideInputType = 'text' | 'voice' | 'image' | 'mixed'

export type GuideRoutePreset = {
  id: string
  title: string
  subtitle: string
  description: string
  prompt: string
  spotIds: string[]
}

export type GuideAction =
  | {
      type: 'open_spot'
      spotId: string
    }
  | {
      type: 'go_home'
    }
  | {
      type: 'select_route'
      routeId: string
    }
  | {
      type: 'open_booking'
      routeId?: string
    }
  | {
      type: 'focus_hotspot'
      spotId: string
    }
  | {
      type: 'open_image_panel'
      spotId?: string
    }
  | {
      type: 'play_tts'
    }
  | {
      type: 'highlight_route_segment'
      routeId: string
    }

export type GuideVisualGrounding = {
  label: string
  bbox?: number[]
  point?: number[]
}

export type GuideMessage = {
  id: string
  role: 'guide' | 'user'
  mode: GuideMode
  title?: string
  content: string
  suggestedPrompts?: string[]
  suggestedSpotIds?: string[]
  actions?: GuideAction[]
  audioUrl?: string | null
  visualGrounding?: GuideVisualGrounding[]
}

export type GuideRequest = {
  sessionId: string
  input: string
  inputType?: GuideInputType
  mediaRefs?: string[]
  clientCapabilities?: {
    voiceInput: boolean
    imageInput: boolean
    tts: boolean
  }
  userId?: string | null
  sessionSummary?: string | null
  mode: GuideMode
  currentView: 'home' | 'detail'
  currentSpotId: string | null
  visitedSpotIds: string[]
  spatialContext?: SpatialGuideContext | null
  activeRouteId?: string | null
  currentSpot?: HeritageSpot | null
  relatedSpots?: HeritageSpot[]
  guideBundle: {
    persona: string
    experienceRules: string
    profileName: string
    profileSubtitle: string
    routeCatalog: GuideRoutePreset[]
  }
}

export type GuideResponse = {
  sessionId: string
  reply: GuideMessage
}

export type GuideRuntimeConfig = {
  enabled?: boolean
  apiUrl?: string
  apiToken?: string
  supportsClientActions?: boolean
  actionSchemaVersion?: string
  notes?: string
}
