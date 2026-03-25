import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import OpenAI from 'openai'
import { zodTextFormat } from 'openai/helpers/zod'
import { readFile } from 'node:fs/promises'
import { z } from 'zod'
import { heritageSpots } from '../src/data/heritage-data.ts'
import type { GuideAction, GuideRequest, GuideResponse, GuideRoutePreset } from '../src/guide/types.ts'
import type { HeritageSpot } from '../src/types.ts'

dotenv.config({
  path: '.env.guide',
})

const GUIDE_API_PORT = Number.parseInt(process.env.GUIDE_API_PORT ?? '8787', 10)
const GUIDE_ALLOWED_ORIGIN = process.env.GUIDE_ALLOWED_ORIGIN?.trim() ?? ''
const GUIDE_SERVER_TOKEN = process.env.GUIDE_SERVER_TOKEN?.trim() ?? ''
const GUIDE_USE_CONVERSATION_STATE = process.env.GUIDE_USE_CONVERSATION_STATE !== 'false'
const OPENAI_GUIDE_MODEL = process.env.OPENAI_GUIDE_MODEL?.trim() || 'gpt-5-mini'
const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() ?? ''

const GUIDE_SESSION_TTL_MS = 1000 * 60 * 45

const guideModeSchema = z.enum(['welcome', 'story', 'route', 'image', 'ask'])

const guideActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('open_spot'),
    spotId: z.string().min(1),
  }),
  z.object({
    type: z.literal('go_home'),
  }),
  z.object({
    type: z.literal('select_route'),
    routeId: z.string().min(1),
  }),
])

const guideReplySchema = z.object({
  mode: guideModeSchema,
  title: z.string().min(2).max(28),
  content: z.string().min(20).max(320),
  suggestedPrompts: z.array(z.string().min(2).max(40)).max(3).default([]),
  suggestedSpotIds: z.array(z.string().min(1)).max(4).default([]),
  actions: z.array(guideActionSchema).max(3).default([]),
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

type SessionState = {
  previousResponseId: string
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

const openaiClient = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null

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

function buildGuideInput(request: GuideRequest) {
  const currentSpot = getCurrentSpot(request)
  const relatedSpots = getRelatedSpots(request, currentSpot)
  const currentRoute = request.guideBundle.routeCatalog.find(
    (route) => route.id === request.activeRouteId,
  )

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
    `【全站建筑索引】`,
    buildSpotCatalogText(),
    ``,
    `【输出要求】`,
    `- reply.title 要像报站题头`,
    `- reply.content 要像导游现场轻讲，不要像资料抄录`,
    `- suggestedPrompts 最多 3 条`,
    `- 只有在用户明确想去哪里、回总览、切路线时才输出 actions`,
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

function sanitizeActions(
  actions: GuideAction[],
  validSpotIds: Set<string>,
  validRouteIds: Set<string>,
) {
  const normalized: GuideAction[] = []

  for (const action of actions) {
    if (action.type === 'open_spot') {
      if (!validSpotIds.has(action.spotId)) {
        continue
      }

      normalized.push(action)
      continue
    }

    if (action.type === 'select_route') {
      if (!validRouteIds.has(action.routeId)) {
        continue
      }

      normalized.push(action)
      continue
    }

    normalized.push(action)
  }

  return normalized.slice(0, 3)
}

function sanitizeReply(
  request: GuideRequest,
  modelReply: GuideModelReply,
): GuideResponse {
  const validSpotIds = new Set(heritageSpots.map((spot) => spot.id))
  const validRouteIds = new Set(request.guideBundle.routeCatalog.map((route) => route.id))

  return {
    sessionId: request.sessionId,
    reply: {
      id: createGuideId(),
      role: 'guide',
      mode: modelReply.mode,
      title: modelReply.title.trim(),
      content: modelReply.content.trim(),
      suggestedPrompts: modelReply.suggestedPrompts
        .map((prompt) => prompt.trim())
        .filter(Boolean)
        .slice(0, 3),
      suggestedSpotIds: modelReply.suggestedSpotIds
        .filter((spotId) => validSpotIds.has(spotId))
        .slice(0, 4),
      actions: sanitizeActions(modelReply.actions, validSpotIds, validRouteIds),
    },
  }
}

async function generateGuideReply(request: GuideRequest): Promise<GuideResponse> {
  if (!openaiClient) {
    throw new Error('OPENAI_API_KEY is missing. Create .env.guide and set your key first.')
  }

  const promptBundle = await resolvePromptBundle(request)
  const sessionState = sessions.get(request.sessionId)

  const response = await openaiClient.responses.parse({
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
    input: buildGuideInput(request),
    text: {
      format: zodTextFormat(guideReplySchema, 'guide_reply'),
    },
  })

  sessions.set(request.sessionId, {
    previousResponseId: response.id,
    updatedAt: Date.now(),
  })

  if (!response.output_parsed) {
    throw new Error('Guide model returned no parsed output.')
  }

  return sanitizeReply(request, response.output_parsed as GuideModelReply)
}

const app = express()

app.use(
  cors({
    origin(origin, callback) {
      if (!GUIDE_ALLOWED_ORIGIN || GUIDE_ALLOWED_ORIGIN === '*') {
        callback(null, true)
        return
      }

      if (!origin || origin === GUIDE_ALLOWED_ORIGIN) {
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
    model: OPENAI_GUIDE_MODEL,
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

  next(error)
})

app.listen(GUIDE_API_PORT, () => {
  console.log(
    `[guide-api] listening on http://127.0.0.1:${GUIDE_API_PORT} | model=${OPENAI_GUIDE_MODEL}`,
  )
})
