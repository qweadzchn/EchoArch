import { guideProfile, guidePromptBundle, guideRoutes } from './content'
import { createMockGuideReply } from './mock'
import type { GuideRequest, GuideResponse } from './types'

const GUIDE_API_URL = import.meta.env.VITE_GUIDE_API_URL?.trim()
const GUIDE_API_TOKEN = import.meta.env.VITE_GUIDE_API_TOKEN?.trim()

export function createGuideSessionId() {
  return `guide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function getGuideConnectionMode() {
  return GUIDE_API_URL ? 'remote' : 'mock'
}

export function getGuideBundle() {
  return {
    persona: guidePromptBundle.persona,
    experienceRules: guidePromptBundle.experienceRules,
    profileName: guideProfile.name,
    profileSubtitle: guideProfile.subtitle,
    routeCatalog: guideRoutes,
  }
}

export async function requestGuideReply(
  request: Omit<GuideRequest, 'guideBundle'>,
): Promise<GuideResponse> {
  const payload: GuideRequest = {
    ...request,
    guideBundle: getGuideBundle(),
  }

  if (!GUIDE_API_URL) {
    await new Promise((resolve) => window.setTimeout(resolve, 520))
    return createMockGuideReply(payload)
  }

  const response = await fetch(GUIDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(GUIDE_API_TOKEN ? { Authorization: `Bearer ${GUIDE_API_TOKEN}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Guide API request failed with ${response.status}`)
  }

  return (await response.json()) as GuideResponse
}
