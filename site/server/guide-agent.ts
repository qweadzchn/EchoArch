import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import OpenAI from 'openai'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { buildRetrievedMaterialText } from './guide-retrieval.ts'
import { buildPublicMemoryPromptText } from './public-memory.ts'
import { heritageSpots } from '../src/data/heritage-data.ts'
import type { GuideAction, GuideRequest, GuideResponse, GuideRoutePreset } from '../src/guide/types.ts'
import type { HeritageSpot } from '../src/types.ts'

dotenv.config({
  path: '.env.guide',
})

const GUIDE_API_PORT = Number.parseInt(process.env.GUIDE_API_PORT ?? '8787', 10)
const GUIDE_ALLOWED_ORIGIN = process.env.GUIDE_ALLOWED_ORIGIN?.trim() ?? ''
const GUIDE_ALLOWED_ORIGINS = GUIDE_ALLOWED_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const GUIDE_SERVER_TOKEN = process.env.GUIDE_SERVER_TOKEN?.trim() ?? ''
const GUIDE_USE_CONVERSATION_STATE = process.env.GUIDE_USE_CONVERSATION_STATE !== 'false'
const GUIDE_API_STYLE = process.env.GUIDE_API_STYLE?.trim().toLowerCase() ?? 'auto'
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL?.trim() ?? ''
const OPENAI_GUIDE_MODEL = process.env.OPENAI_GUIDE_MODEL?.trim() || 'gpt-5-mini'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() ?? ''

const GUIDE_SESSION_TTL_MS = 1000 * 60 * 45
const GUIDE_CHAT_HISTORY_LIMIT = 12

const guideModeSchema = z.enum(['welcome', 'story', 'route', 'image', 'ask'])

const rawGuideActionSchema = z.object({
  type: z.string().default(''),
  spotId: z.string().optional(),
  routeId: z.string().optional(),
})

const guideReplySchema = z.object({
  mode: z.string().default('ask'),
  title: z.string().default('泉上引游'),
  content: z.string().default('先从眼前这处看起，我陪你慢慢入景。'),
  suggestedPrompts: z.array(z.string()).default([]),
  suggestedSpotIds: z.array(z.string()).default([]),
  actions: z.array(rawGuideActionSchema).default([]),
})

const guideRequestSchema = z.object({
  sessionId: z.string().min(1),
  input: z.string().min(1),
  mode: guideModeSchema,
  currentView: z.enum(['home', 'detail']),
  currentSpotId: z.string().nullable(),
  visitedSpotIds: z.array(z.string()),
  activeRouteId: z.string().nullable().optional(),
  currentSpot: z.unknown().nullable().optional(),
  relatedSpots: z.array(z.unknown()).optional(),
  guideBundle: z.object({
    persona: z.string().default(''),
    experienceRules: z.string().default(''),
    profileName: z.string().default('泉上引游人'),
    profileSubtitle: z.string().default('不急着回答，先陪你入景'),
    routeCatalog: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          subtitle: z.string(),
          description: z.string(),
          prompt: z.string(),
          spotIds: z.array(z.string()),
        }),
      )
      .default([]),
  }),
})

type GuideModelReply = z.infer<typeof guideReplySchema>
type RawGuideAction = z.infer<typeof rawGuideActionSchema>

type GuideApiStyle = 'responses' | 'chat'

type GuideHistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

type SessionState = {
  previousResponseId?: string
  history?: GuideHistoryMessage[]
  updatedAt: number
}

type PromptBundle = {
  backendSystem: string
  persona: string
  experienceRules: string
}

const sessions = new Map<string, SessionState>()

const spotIndex = new Map(heritageSpots.map((spot) => [spot.id, spot]))
const defaultPromptBundlePromise = Promise.all([
  readFile(new URL('./prompts/guide-backend-system.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/guide/prompts/persona.md', import.meta.url), 'utf8'),
  readFile(new URL('../src/guide/prompts/experience-rules.md', import.meta.url), 'utf8'),
]).then(([backendSystem, persona, experienceRules]) => ({
  backendSystem,
  persona,
  experienceRules,
}))

const openaiClient = OPENAI_API_KEY
  ? new OpenAI({
      apiKey: OPENAI_API_KEY,
      ...(OPENAI_BASE_URL ? { baseURL: OPENAI_BASE_URL } : {}),
    })
  : null

function resolveGuideApiStyle(): GuideApiStyle {
  if (GUIDE_API_STYLE === 'responses') {
    return 'responses'
  }

  if (
    GUIDE_API_STYLE === 'chat' ||
    GUIDE_API_STYLE === 'chat.completions' ||
    GUIDE_API_STYLE === 'chat_completions'
  ) {
    return 'chat'
  }

  const normalizedBaseUrl = OPENAI_BASE_URL.toLowerCase()
  const normalizedModel = OPENAI_GUIDE_MODEL.toLowerCase()

  if (normalizedBaseUrl.includes('deepseek.com') || normalizedModel.startsWith('deepseek-')) {
    return 'chat'
  }

  return 'responses'
}

const guideApiStyle = resolveGuideApiStyle()

function cleanupExpiredSessions() {
  const now = Date.now()

  for (const [sessionId, state] of sessions.entries()) {
    if (now - state.updatedAt > GUIDE_SESSION_TTL_MS) {
      sessions.delete(sessionId)
    }
  }
}

setInterval(cleanupExpiredSessions, 1000 * 60 * 5).unref()

function createGuideId() {
  return `guide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeOrigin(origin: string) {
  try {
    const url = new URL(origin)
    const isLoopback = ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(url.hostname)
    const port = url.port || (url.protocol === 'https:' ? '443' : '80')
    const host = isLoopback ? 'loopback' : url.hostname

    return `${url.protocol}//${host}:${port}`
  } catch {
    return origin.trim()
  }
}

function isAllowedOrigin(origin: string | undefined) {
  if (!GUIDE_ALLOWED_ORIGINS.length || GUIDE_ALLOWED_ORIGINS.includes('*')) {
    return true
  }

  if (!origin) {
    return true
  }

  const normalizedOrigin = normalizeOrigin(origin)
  return GUIDE_ALLOWED_ORIGINS.some((allowedOrigin) => {
    return normalizeOrigin(allowedOrigin) === normalizedOrigin
  })
}

function clipText(text: string | undefined, maxLength: number) {
  if (!text) {
    return ''
  }

  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}…`
}

function toSpotSummary(spot: HeritageSpot) {
  return [
    `name=${spot.name}`,
    `id=${spot.id}`,
    `region=${spot.region}`,
    `world=${spot.world}`,
    `highlight=${clipText(spot.highlight, 48)}`,
    `description=${clipText(spot.description, 80)}`,
    `related=${spot.related.join(',') || 'none'}`,
  ].join(' | ')
}

function getCurrentSpot(request: GuideRequest) {
  if (request.currentSpot && typeof request.currentSpot === 'object') {
    return request.currentSpot as HeritageSpot
  }

  if (!request.currentSpotId) {
    return null
  }

  return spotIndex.get(request.currentSpotId) ?? null
}

function getRelatedSpots(request: GuideRequest, currentSpot: HeritageSpot | null) {
  if (request.relatedSpots?.length) {
    return request.relatedSpots as HeritageSpot[]
  }

  if (!currentSpot) {
    return []
  }

  return currentSpot.related
    .map((spotId) => spotIndex.get(spotId))
    .filter((spot): spot is HeritageSpot => Boolean(spot))
}

function buildRouteCatalogText(routeCatalog: GuideRoutePreset[]) {
  if (!routeCatalog.length) {
    return '无可用路线目录'
  }

  return routeCatalog
    .map((route) => {
      return [
        `title=${route.title}`,
        `id=${route.id}`,
        `subtitle=${route.subtitle}`,
        `description=${clipText(route.description, 90)}`,
        `spots=${route.spotIds.join(' -> ')}`,
      ].join(' | ')
    })
    .join('\n')
}

function buildSpotCatalogText() {
  return heritageSpots.map((spot) => toSpotSummary(spot)).join('\n')
}

function normalizeSearchText(text: string) {
  return text.toLowerCase().replace(/\s+/g, '')
}

function buildQueryTerms(input: string) {
  const normalized = input.trim()
  const compact = normalizeSearchText(normalized)
  const terms = new Set<string>()
  const stopTerms = new Set([
    '一下',
    '一下子',
    '请问',
    '帮我',
    '带我',
    '我们',
    '这里',
    '这个',
    '那个',
    '怎么',
    '为什么',
    '详细',
    '具体',
    '介绍',
    '讲讲',
    '说说',
    '资料',
    '历史',
  ])

  if (compact.length >= 2 && compact.length <= 24) {
    terms.add(compact)
  }

  const segments = normalized.match(/[\p{Script=Han}A-Za-z0-9]+/gu) ?? []

  for (const rawSegment of segments) {
    const segment = normalizeSearchText(rawSegment)

    if (segment.length < 2 || stopTerms.has(segment)) {
      continue
    }

    terms.add(segment)

    if (/^[\p{Script=Han}]+$/u.test(segment)) {
      const maxGram = Math.min(4, segment.length)

      for (let gramLength = 2; gramLength <= maxGram; gramLength += 1) {
        for (let index = 0; index <= segment.length - gramLength; index += 1) {
          const gram = segment.slice(index, index + gramLength)

          if (!stopTerms.has(gram)) {
            terms.add(gram)
          }
        }
      }
    }
  }

  return [...terms].filter((term) => term.length >= 2)
}

function scoreSpotForInput(spot: HeritageSpot, input: string, currentSpot: HeritageSpot | null) {
  const normalizedInput = normalizeSearchText(input)
  const document = normalizeSearchText(
    [
      spot.name,
      spot.region,
      spot.world,
      spot.era,
      spot.highlight,
      spot.description,
      spot.excerpt,
      spot.fullText,
    ].join(' '),
  )
  const queryTerms = buildQueryTerms(input)
  let score = 0

  if (normalizedInput.includes(normalizeSearchText(spot.name))) {
    score += 28
  }

  if (normalizedInput.includes(normalizeSearchText(spot.region))) {
    score += 8
  }

  if (currentSpot?.id === spot.id) {
    score += 12
  } else if (currentSpot?.related.includes(spot.id)) {
    score += 6
  }

  for (const term of queryTerms) {
    if (!document.includes(term)) {
      continue
    }

    if (term === normalizeSearchText(spot.name)) {
      score += 18
      continue
    }

    if (term.length >= 6) {
      score += 6
    } else if (term.length >= 4) {
      score += 4
    } else if (term.length === 3) {
      score += 2
    } else {
      score += 1
    }
  }

  return score
}

function buildProjectMaterialText(request: GuideRequest) {
  const currentSpot = getCurrentSpot(request)

  if (request.input) {
    const preflightScore = currentSpot ? scoreSpotForInput(currentSpot, request.input, currentSpot) : 0
    void preflightScore
    return buildRetrievedMaterialText(request)
  }

  const rankedSpots = heritageSpots
    .map((spot) => ({
      spot,
      score: scoreSpotForInput(spot, request.input, currentSpot),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)

  const selectedSpots = rankedSpots.slice(0, 3).map((entry) => entry.spot)

  if (!selectedSpots.length) {
    return '未命中更多项目内部资料摘录，可优先依据当前点位上下文与全站索引回答。'
  }

  return selectedSpots
    .map((spot, index) => {
      return [
        `[资料 ${index + 1}] ${spot.name} (${spot.id})`,
        `区域：${spot.region} / 时代：${spot.era}`,
        `亮点：${clipText(spot.highlight, 60)}`,
        `摘要：${clipText(spot.excerpt || spot.description, 120)}`,
        `项目资料摘录：${clipText(spot.fullText, 260)}`,
      ].join('\n')
    })
    .join('\n\n')
}

function inferExplicitGuideActions(request: GuideRequest): GuideAction[] {
  const input = request.input.trim()
  const compactInput = normalizeSearchText(input)
  const actions: GuideAction[] = []
  const goHomeIntents = [
    '回总览',
    '回到总览',
    '返回总览',
    '回首页',
    '回到首页',
    '返回首页',
    '回地图',
    '返回地图',
    '回总览图',
  ]

  if (goHomeIntents.some((intent) => compactInput.includes(normalizeSearchText(intent)))) {
    return [{ type: 'go_home' }]
  }

  const matchedRoute = request.guideBundle.routeCatalog
    .slice()
    .sort((left, right) => right.title.length - left.title.length)
    .find((route) => {
      const title = normalizeSearchText(route.title)
      const subtitle = normalizeSearchText(route.subtitle)
      const prompt = normalizeSearchText(route.prompt)
      const hasRouteName =
        compactInput.includes(title) ||
        (subtitle.length >= 2 && compactInput.includes(subtitle)) ||
        compactInput.includes(prompt)
      const hasRouteIntent =
        compactInput.includes('走') ||
        compactInput.includes('换线') ||
        compactInput.includes('路线') ||
        compactInput.includes('沿着') ||
        compactInput.includes('按') ||
        compactInput.includes('切到') ||
        compactInput.includes('选') ||
        compactInput.includes('选择')

      return hasRouteName && hasRouteIntent
    })

  if (matchedRoute) {
    actions.push({
      type: 'select_route',
      routeId: matchedRoute.id,
    })

    if (!request.currentSpotId && matchedRoute.spotIds[0]) {
      actions.push({
        type: 'open_spot',
        spotId: matchedRoute.spotIds[0],
      })
    }
  }

  const matchedSpot = heritageSpots
    .slice()
    .sort((left, right) => right.name.length - left.name.length)
    .find((spot) => {
      const name = normalizeSearchText(spot.name)
      const hasSpotIntent =
        compactInput.includes(`去${name}`) ||
        compactInput.includes(`到${name}`) ||
        compactInput.includes(`前往${name}`) ||
        compactInput.includes(`带我去${name}`) ||
        compactInput.includes(`带我到${name}`) ||
        compactInput.includes(`进入${name}`) ||
        compactInput.includes(`打开${name}`) ||
        compactInput.includes(`跳到${name}`) ||
        compactInput.includes(`切到${name}`)

      return hasSpotIntent || compactInput === name
    })

  if (matchedSpot && !actions.some((action) => action.type === 'open_spot')) {
    actions.push({
      type: 'open_spot',
      spotId: matchedSpot.id,
    })
  }

  return actions.slice(0, 3)
}

function buildGuideInput(request: GuideRequest) {
  const currentSpot = getCurrentSpot(request)
  const relatedSpots = getRelatedSpots(request, currentSpot)
  const currentRoute = request.guideBundle.routeCatalog.find(
    (route) => route.id === request.activeRouteId,
  )
  const sharedMemorySection = buildPublicMemoryPromptText(request)

  const currentSpotSection = currentSpot
    ? [
        `当前建筑：${currentSpot.name} (${currentSpot.id})`,
        `亮点：${clipText(currentSpot.highlight, 60)}`,
        `简介：${clipText(currentSpot.description, 120)}`,
        `全文资料节选：${clipText(currentSpot.fullText, 500)}`,
      ].join('\n')
    : '当前处于总览图首页，没有进入具体建筑详情页。'

  const relatedSection = relatedSpots.length
    ? relatedSpots.map((spot) => `- ${spot.name} (${spot.id})`).join('\n')
    : '无关联建筑提示'

  const currentRouteSection = currentRoute
    ? `当前路线：${currentRoute.title} (${currentRoute.id})\n路线说明：${clipText(currentRoute.description, 120)}`
    : '当前没有激活路线'

  return [
    `【用户原话】`,
    request.input,
    ``,
    `【界面状态】`,
    `currentView=${request.currentView}`,
    `mode=${request.mode}`,
    `currentSpotId=${request.currentSpotId ?? 'none'}`,
    `visitedSpotIds=${request.visitedSpotIds.join(',') || 'none'}`,
    `activeRouteId=${request.activeRouteId ?? 'none'}`,
    ``,
    `【当前建筑上下文】`,
    currentSpotSection,
    ``,
    `【关联建筑】`,
    relatedSection,
    ``,
    `【当前路线】`,
    currentRouteSection,
    ``,
    `【可用路线目录】`,
    buildRouteCatalogText(request.guideBundle.routeCatalog),
    ``,
    `【项目内部资料摘录】`,
    buildProjectMaterialText(request),
    ``,
    `【Shared visit memory】`,
    sharedMemorySection,
    ``,
    `【全站建筑索引】`,
    buildSpotCatalogText(),
    ``,
    `【输出要求】`,
    `- reply.title 要像报站题头`,
    `- reply.content 要像导游现场轻讲，不要像资料抄录`,
    `- suggestedPrompts 最多 3 条`,
    `- 只有在用户明确想去哪里、回总览、切路线时才输出 actions`,
    `- 如果用户要求详细说明、比较、追问缘由，优先依据“项目内部资料摘录”回答`,
    `- 如果现有资料没有直接写到，就明确说项目资料里没有直接写到，再做谨慎推断`,
  ].join('\n')
}

async function resolvePromptBundle(request: GuideRequest): Promise<PromptBundle> {
  const fallback = await defaultPromptBundlePromise

  return {
    backendSystem: fallback.backendSystem,
    persona: request.guideBundle.persona.trim() || fallback.persona,
    experienceRules: request.guideBundle.experienceRules.trim() || fallback.experienceRules,
  }
}

function buildGuideInstructions(promptBundle: PromptBundle) {
  return [
    promptBundle.backendSystem.trim(),
    '',
    '【导游人设】',
    promptBundle.persona.trim(),
    '',
    '【体验规则】',
    promptBundle.experienceRules.trim(),
  ].join('\n')
}

function buildGuideOutputContract() {
  return [
    'Return exactly one JSON object with fields:',
    'mode,title,content,suggestedPrompts,suggestedSpotIds,actions',
    'Do not output Markdown.',
    'If no actions are needed, return an empty actions array.',
  ].join('\n')
}

function buildGuideUserPrompt(request: GuideRequest) {
  return [buildGuideInput(request), '', buildGuideOutputContract()].join('\n')
}

function getSessionState(sessionId: string) {
  return sessions.get(sessionId) ?? { history: [], updatedAt: Date.now() }
}

function trimGuideHistory(history: GuideHistoryMessage[]) {
  return history.slice(-GUIDE_CHAT_HISTORY_LIMIT)
}

function readChatCompletionText(content: unknown) {
  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === 'string') {
          return part
        }

        if (
          part &&
          typeof part === 'object' &&
          'type' in part &&
          'text' in part &&
          (part as { type?: string }).type === 'text'
        ) {
          return String((part as { text?: string }).text ?? '')
        }

        return ''
      })
      .join('')
      .trim()

    if (text) {
      return text
    }
  }

  throw new Error('Guide model returned empty content.')
}

function sanitizeActions(
  actions: RawGuideAction[],
  validSpotIds: Set<string>,
  validRouteIds: Set<string>,
) {
  const normalized: GuideAction[] = []

  for (const action of actions) {
    if (action.type === 'open_spot' && action.spotId) {
      if (!validSpotIds.has(action.spotId)) {
        continue
      }

      normalized.push({
        type: 'open_spot',
        spotId: action.spotId,
      })
      continue
    }

    if (action.type === 'select_route' && action.routeId) {
      if (!validRouteIds.has(action.routeId)) {
        continue
      }

      normalized.push({
        type: 'select_route',
        routeId: action.routeId,
      })
      continue
    }

    if (action.type === 'go_home') {
      normalized.push({
        type: 'go_home',
      })
    }
  }

  return normalized.slice(0, 3)
}

function extractJsonObject(text: string) {
  const trimmed = text.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  throw new Error('Guide model returned non-JSON content.')
}

function parseGuideReplyText(text: string) {
  const jsonText = extractJsonObject(text)
  const parsed = guideReplySchema.safeParse(JSON.parse(jsonText))

  if (!parsed.success) {
    throw new Error('Guide model returned invalid JSON structure.')
  }

  return parsed.data
}

function clipReplyText(text: string | undefined, maxLength: number, fallback: string) {
  const normalized = text?.replace(/\s+/g, ' ').trim() ?? ''

  if (!normalized) {
    return fallback
  }

  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}…`
}

function normalizeGuideMode(mode: string | undefined) {
  const normalized = mode?.trim().toLowerCase() ?? ''

  switch (normalized) {
    case 'welcome':
    case 'story':
    case 'route':
    case 'image':
    case 'ask':
      return normalized
    case 'clarify':
    case 'question':
    case 'qa':
    case 'chat':
      return 'ask'
    case 'tour':
    case 'narrate':
      return 'story'
    default:
      return 'ask'
  }
}

function sanitizeReply(
  request: GuideRequest,
  modelReply: GuideModelReply,
): GuideResponse {
  const validSpotIds = new Set(heritageSpots.map((spot) => spot.id))
  const validRouteIds = new Set(request.guideBundle.routeCatalog.map((route) => route.id))
  const explicitActions = inferExplicitGuideActions(request)
  const normalizedActions = explicitActions.length
    ? explicitActions
    : sanitizeActions(modelReply.actions, validSpotIds, validRouteIds)

  return {
    sessionId: request.sessionId,
    reply: {
      id: createGuideId(),
      role: 'guide',
      mode: normalizeGuideMode(modelReply.mode),
      title: clipReplyText(modelReply.title, 28, '泉上引游'),
      content: clipReplyText(modelReply.content, 320, '先从眼前这处看起，我陪你慢慢入景。'),
      suggestedPrompts: modelReply.suggestedPrompts
        .map((prompt) => clipReplyText(prompt, 40, ''))
        .filter((prompt) => prompt.length >= 2)
        .slice(0, 3),
      suggestedSpotIds: modelReply.suggestedSpotIds
        .filter((spotId) => validSpotIds.has(spotId))
        .slice(0, 4),
      actions: normalizedActions,
    },
  }
}

async function generateGuideReplyLegacy(request: GuideRequest): Promise<GuideResponse> {
  if (!openaiClient) {
    throw new Error('OPENAI_API_KEY is missing. Create .env.guide and set your key first.')
  }

  const promptBundle = await resolvePromptBundle(request)
  const sessionState = sessions.get(request.sessionId)

  const response = await openaiClient.responses.create({
    model: OPENAI_GUIDE_MODEL,
    previous_response_id:
      GUIDE_USE_CONVERSATION_STATE && sessionState ? sessionState.previousResponseId : undefined,
    instructions: [
      promptBundle.backendSystem.trim(),
      '',
      '【导游人设】',
      promptBundle.persona.trim(),
      '',
      '【体验规则】',
      promptBundle.experienceRules.trim(),
    ].join('\n'),
    input: [
      buildGuideInput(request),
      '',
      'Return exactly one JSON object with fields:',
      'mode,title,content,suggestedPrompts,suggestedSpotIds,actions',
      'Do not output Markdown.',
      'If no actions are needed, return an empty actions array.',
    ].join('\n'),
  })

  sessions.set(request.sessionId, {
    previousResponseId: response.id,
    updatedAt: Date.now(),
  })

  const outputText = response.output_text?.trim()

  if (!outputText) {
    throw new Error('Guide model returned empty content.')
  }

  return sanitizeReply(request, parseGuideReplyText(outputText))
}

async function generateGuideReply(request: GuideRequest): Promise<GuideResponse> {
  if (!openaiClient) {
    throw new Error('OPENAI_API_KEY is missing. Create .env.guide and set your key first.')
  }

  const client = openaiClient
  const promptBundle = await resolvePromptBundle(request)
  const sessionState = getSessionState(request.sessionId)
  const instructions = buildGuideInstructions(promptBundle)
  const userPrompt = buildGuideUserPrompt(request)

  async function requestByResponsesApi() {
    return generateGuideReplyLegacy(request)
  }

  async function requestByChatCompletionsApi() {
    const priorMessages = GUIDE_USE_CONVERSATION_STATE ? (sessionState.history ?? []) : []
    const response = await client.chat.completions.create({
      model: OPENAI_GUIDE_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: instructions },
        ...priorMessages,
        { role: 'user', content: userPrompt },
      ],
    })

    const outputText = readChatCompletionText(response.choices[0]?.message?.content)

    if (GUIDE_USE_CONVERSATION_STATE) {
      sessions.set(request.sessionId, {
        history: trimGuideHistory([
          ...priorMessages,
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: outputText },
        ]),
        updatedAt: Date.now(),
      })
    }

    return sanitizeReply(request, parseGuideReplyText(outputText))
  }

  if (guideApiStyle === 'chat') {
    return requestByChatCompletionsApi()
  }

  try {
    return await requestByResponsesApi()
  } catch (error) {
    const status =
      typeof error === 'object' && error && 'status' in error ? Number(error.status) : undefined

    if (GUIDE_API_STYLE === 'auto' && status === 404) {
      return requestByChatCompletionsApi()
    }

    throw error
  }
}

const app = express()

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true)
        return
      }

      callback(new Error(`Origin ${origin} is not allowed.`))
    },
  }),
)

app.use(express.json({ limit: '1mb' }))

app.get('/api/guide/health', (_request, response) => {
  response.json({
    ok: true,
    configured: Boolean(OPENAI_API_KEY),
    baseUrl: OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: OPENAI_GUIDE_MODEL,
    apiStyle: guideApiStyle,
    usesConversationState: GUIDE_USE_CONVERSATION_STATE,
    requiresBearerToken: Boolean(GUIDE_SERVER_TOKEN),
  })
})

app.post('/api/guide', async (request, response) => {
  if (GUIDE_SERVER_TOKEN) {
    const authorization = request.header('authorization')

    if (authorization !== `Bearer ${GUIDE_SERVER_TOKEN}`) {
      response.status(401).json({
        error: 'Unauthorized guide API request.',
      })
      return
    }
  }

  const parsedRequest = guideRequestSchema.safeParse(request.body)

  if (!parsedRequest.success) {
    response.status(400).json({
      error: 'Invalid guide request payload.',
      issues: parsedRequest.error.flatten(),
    })
    return
  }

  try {
    const guideResponse = await generateGuideReply(parsedRequest.data as GuideRequest)
    response.json(guideResponse)
  } catch (error) {
    console.error('[guide-api] request failed', error)
    const message =
      error instanceof Error ? error.message : 'Unknown guide backend error.'

    response.status(500).json({
      error: message,
    })
  }
})

app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
  if (error instanceof SyntaxError) {
    response.status(400).json({
      error: 'Malformed JSON body.',
    })
    return
  }

  if (error instanceof Error) {
    response.status(error.message.includes('Origin ') ? 403 : 500).json({
      error: error.message,
    })
    return
  }

  next(error)
})

app.listen(GUIDE_API_PORT, () => {
  console.log(
    `[guide-api] listening on http://127.0.0.1:${GUIDE_API_PORT} | baseUrl=${
      OPENAI_BASE_URL || 'https://api.openai.com/v1'
    } | model=${OPENAI_GUIDE_MODEL}`,
  )
})
