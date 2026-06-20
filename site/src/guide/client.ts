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

function stripHtmlTags(text: string) {
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function resolveGuideErrorMessage(response: Response) {
  const text = (await response.text()).trim()

  if (!text) {
    return `导游暂时没有接上话，服务返回了 ${response.status}。`
  }

  try {
    const parsed = JSON.parse(text) as { error?: string }

    if (parsed.error?.trim()) {
      return parsed.error.trim()
    }
  } catch {
    // fall through to plain-text cleanup
  }

  const normalized = stripHtmlTags(text)

  if (normalized.includes('Origin ') && normalized.includes('not allowed')) {
    return '当前页面地址没有被导游后端放行，请重启导游服务后再试。'
  }

  return normalized || `导游暂时没有接上话，服务返回了 ${response.status}。`
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
    inputType: 'text',
    mediaRefs: [],
    clientCapabilities: {
      voiceInput: true,
      imageInput: true,
      tts: typeof window !== 'undefined' && 'speechSynthesis' in window,
    },
    ...request,
    guideBundle: getGuideBundle(),
  }

  const config = await loadGuideRuntimeConfig()
  const { apiUrl, apiToken } = resolveGuideEndpoint(config)

  if (!apiUrl) {
    await new Promise((resolve) => window.setTimeout(resolve, 520))
    return createMockGuideReply(payload)
  }

  let response: Response

  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('导游暂时没有连上，请确认本地导游后端已经启动。')
  }

  if (!response.ok) {
    throw new Error(await resolveGuideErrorMessage(response))
  }

  return (await response.json()) as GuideResponse
}
