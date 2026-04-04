import { readFileSync } from 'node:fs'
import { heritageSpots } from '../src/data/heritage-data.ts'
import type { GuideRequest } from '../src/guide/types.ts'
import type { HeritageSpot } from '../src/types.ts'

type BaseMemoryStats = {
  confidence: number
  evidence_count: number
  last_seen_at: string | null
}

type SceneHintProfile = BaseMemoryStats & {
  scene_id: string
  trigger: string
  hint_text: string
  cooldown_minutes: number
}

type HotQuestionBySpot = BaseMemoryStats & {
  spot_id: string
  question_cluster: string
  answer_strategy: string
  frequency_30d: number
}

type CommonConfusion = BaseMemoryStats & {
  scene_id: string
  confusion_type: string
  symptom: string
  recommended_hint: string
  frequency_30d: number
}

type RouteAcceptancePattern = BaseMemoryStats & {
  route_id: string
  entry_scene: string
  best_intro_style: string
  acceptance_rate: number
  best_next_stop: string | null
}

type BlindSpot = BaseMemoryStats & {
  scene_id: string
  overlooked_target: string
  best_recovery_hint: string
}

type PublicMemory = {
  version: string
  updated_at: string
  window_days: number
  scene_hint_profiles: SceneHintProfile[]
  hot_questions_by_spot: HotQuestionBySpot[]
  common_confusions: CommonConfusion[]
  route_acceptance_patterns: RouteAcceptancePattern[]
  blind_spots: BlindSpot[]
}

export type PublicMemoryContext = {
  sceneIds: string[]
  spotBoosts: Map<string, number>
  promptNotes: string[]
}

const spotIndex = new Map(heritageSpots.map((spot) => [spot.id, spot]))

const EMPTY_PUBLIC_MEMORY: PublicMemory = {
  version: '0.0.0',
  updated_at: new Date(0).toISOString(),
  window_days: 30,
  scene_hint_profiles: [],
  hot_questions_by_spot: [],
  common_confusions: [],
  route_acceptance_patterns: [],
  blind_spots: [],
}

const publicMemory = loadPublicMemory()

function loadPublicMemory(): PublicMemory {
  try {
    const raw = readFileSync(new URL('./memory/public-memory.seed.json', import.meta.url), 'utf8')
    const parsed = JSON.parse(raw) as Partial<PublicMemory>

    return {
      version: parsed.version ?? EMPTY_PUBLIC_MEMORY.version,
      updated_at: parsed.updated_at ?? EMPTY_PUBLIC_MEMORY.updated_at,
      window_days: parsed.window_days ?? EMPTY_PUBLIC_MEMORY.window_days,
      scene_hint_profiles: parsed.scene_hint_profiles ?? [],
      hot_questions_by_spot: parsed.hot_questions_by_spot ?? [],
      common_confusions: parsed.common_confusions ?? [],
      route_acceptance_patterns: parsed.route_acceptance_patterns ?? [],
      blind_spots: parsed.blind_spots ?? [],
    }
  } catch {
    return EMPTY_PUBLIC_MEMORY
  }
}

function normalizeSearchText(text: string) {
  return text.toLowerCase().replace(/\s+/g, '')
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

function deriveSceneIds(request: GuideRequest, currentSpot: HeritageSpot | null) {
  const sceneIds = new Set<string>()

  sceneIds.add(request.currentView === 'detail' ? 'page:detail' : 'page:home')

  if (currentSpot) {
    sceneIds.add('spot:detail')
    sceneIds.add(`spot:${currentSpot.id}`)
    sceneIds.add(`world:${currentSpot.world}`)
  } else {
    sceneIds.add(request.visitedSpotIds.length === 0 ? 'overview:first-visit' : 'overview:returning')
  }

  if (request.mode === 'image') {
    sceneIds.add(currentSpot ? 'spot:image-focus' : 'overview:image-focus')
  }

  if (request.mode === 'route') {
    sceneIds.add(currentSpot ? 'spot:route-decision' : 'overview:route-selection')
  }

  if (request.activeRouteId) {
    sceneIds.add(`route:${request.activeRouteId}`)
  }

  return [...sceneIds]
}

function matchesQuestionCluster(cluster: string, input: string) {
  const normalizedCluster = normalizeSearchText(cluster)
  const normalizedInput = normalizeSearchText(input)

  if (!normalizedCluster || !normalizedInput) {
    return false
  }

  return normalizedInput.includes(normalizedCluster) || normalizedCluster.includes(normalizedInput)
}

function selectPromptNotes(currentSpot: HeritageSpot | null, sceneIds: string[]) {
  const notes: string[] = []
  const sceneSet = new Set(sceneIds)

  for (const confusion of publicMemory.common_confusions) {
    if (!sceneSet.has(confusion.scene_id)) {
      continue
    }

    notes.push(
      `Common confusion in ${confusion.scene_id}: ${confusion.symptom}. Prefer hint: ${confusion.recommended_hint}.`,
    )
  }

  for (const blindSpot of publicMemory.blind_spots) {
    if (!sceneSet.has(blindSpot.scene_id)) {
      continue
    }

    notes.push(
      `Visitors often miss ${blindSpot.overlooked_target}. Recovery hint: ${blindSpot.best_recovery_hint}.`,
    )
  }

  for (const hintProfile of publicMemory.scene_hint_profiles) {
    if (!sceneSet.has(hintProfile.scene_id)) {
      continue
    }

    notes.push(`When ${hintProfile.trigger}, a light hint can help: ${hintProfile.hint_text}.`)
  }

  for (const routePattern of publicMemory.route_acceptance_patterns) {
    if (!sceneSet.has(routePattern.entry_scene)) {
      continue
    }

    notes.push(
      `In ${routePattern.entry_scene}, route ${routePattern.route_id} is often accepted. Best intro style: ${routePattern.best_intro_style}.`,
    )
  }

  if (currentSpot) {
    for (const hotQuestion of publicMemory.hot_questions_by_spot) {
      if (hotQuestion.spot_id !== currentSpot.id) {
        continue
      }

      notes.push(
        `At ${currentSpot.name}, visitors often ask about ${hotQuestion.question_cluster}. Strategy: ${hotQuestion.answer_strategy}.`,
      )
    }
  }

  return notes.slice(0, 3)
}

function buildSpotBoosts(request: GuideRequest, currentSpot: HeritageSpot | null, sceneIds: string[]) {
  const boosts = new Map<string, number>()
  const sceneSet = new Set(sceneIds)

  for (const hotQuestion of publicMemory.hot_questions_by_spot) {
    const baseBoost =
      hotQuestion.confidence * 8 +
      Math.min(6, hotQuestion.frequency_30d / 8) +
      (currentSpot?.id === hotQuestion.spot_id ? 5 : 0)

    if (currentSpot?.id === hotQuestion.spot_id || matchesQuestionCluster(hotQuestion.question_cluster, request.input)) {
      boosts.set(hotQuestion.spot_id, (boosts.get(hotQuestion.spot_id) ?? 0) + baseBoost)
    }
  }

  for (const routePattern of publicMemory.route_acceptance_patterns) {
    if (!sceneSet.has(routePattern.entry_scene) || !routePattern.best_next_stop) {
      continue
    }

    boosts.set(
      routePattern.best_next_stop,
      (boosts.get(routePattern.best_next_stop) ?? 0) + routePattern.confidence * 10 + routePattern.acceptance_rate * 6,
    )
  }

  return boosts
}

export function getPublicMemoryContext(request: GuideRequest): PublicMemoryContext {
  const currentSpot = getCurrentSpot(request)
  const sceneIds = deriveSceneIds(request, currentSpot)

  return {
    sceneIds,
    spotBoosts: buildSpotBoosts(request, currentSpot, sceneIds),
    promptNotes: selectPromptNotes(currentSpot, sceneIds),
  }
}

export function buildPublicMemoryPromptText(request: GuideRequest) {
  const { promptNotes } = getPublicMemoryContext(request)

  if (!promptNotes.length) {
    return 'No strong shared-memory pattern is active for this scene.'
  }

  return promptNotes.map((note, index) => `- Note ${index + 1}: ${note}`).join('\n')
}
