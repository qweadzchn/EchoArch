import { guideProfile, guidePromptBundle, guideRoutes } from './content'
import { createMockGuideReply } from './mock'
import type { GuideRequest, GuideResponse, GuideRuntimeConfig } from './types'

const GUIDE_API_URL = import.meta.env.VITE_GUIDE_API_URL?.trim() ?? ''
const GUIDE_API_TOKEN = import.meta.env.VITE_GUIDE_API_TOKEN?.trim() ?? ''
const GUIDE_RUNTIME_CONFIG_URL = '/guide-agent.config.json'

let guideRuntimeConfigPromise: Promise<GuideRuntimeConfig | null> | null = null

function normalizeConfigValue(value: string | undefined) {
  return value?.trim() ?? ''
}

async function loadGuideRuntimeConfig() {
  if (!guideRuntimeConfigPromise) {
    guideRuntimeConfigPromise = fetch(GUIDE_RUNTIME_CONFIG_URL, {
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) {
          return null
        }

        return (await response.json()) as GuideRuntimeConfig
      })
      .catch(() => null)
  }

  return guideRuntimeConfigPromise
}

function resolveGuideEndpoint(config: GuideRuntimeConfig | null) {
  if (config?.enabled === false) {
    return {
      apiUrl: '',
      apiToken: '',
      config,
    }
  }

  return {
    apiUrl: normalizeConfigValue(config?.apiUrl) || GUIDE_API_URL,
    apiToken: normalizeConfigValue(config?.apiToken) || GUIDE_API_TOKEN,
    config,
  }
}

export function createGuideSessionId() {
  return `guide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function preloadGuideRuntimeConfig() {
  return loadGuideRuntimeConfig()
}

export async function getGuideConnectionMode() {
  const config = await loadGuideRuntimeConfig()
  return resolveGuideEndpoint(config).apiUrl ? 'remote' : 'mock'
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

  const config = await loadGuideRuntimeConfig()
  const { apiUrl, apiToken } = resolveGuideEndpoint(config)

  if (!apiUrl) {
    await new Promise((resolve) => window.setTimeout(resolve, 520))
    return createMockGuideReply(payload)
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Guide API request failed with ${response.status}`)
  }

  return (await response.json()) as GuideResponse
}
