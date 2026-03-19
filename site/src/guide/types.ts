import type { HeritageSpot } from '../types'

export type GuideMode = 'welcome' | 'story' | 'route' | 'image' | 'ask'

export type GuideRoutePreset = {
  id: string
  title: string
  subtitle: string
  description: string
  prompt: string
  spotIds: string[]
}

export type GuideMessage = {
  id: string
  role: 'guide' | 'user'
  mode: GuideMode
  title?: string
  content: string
  suggestedPrompts?: string[]
  suggestedSpotIds?: string[]
}

export type GuideRequest = {
  sessionId: string
  input: string
  mode: GuideMode
  currentView: 'home' | 'detail'
  currentSpotId: string | null
  visitedSpotIds: string[]
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
