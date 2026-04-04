import { heritageSpots } from '../src/data/heritage-data.ts'
import type { GuideRequest } from '../src/guide/types.ts'
import type { HeritageSpot } from '../src/types.ts'
import { getPublicMemoryContext } from './public-memory.ts'

type MaterialChunkKind = 'summary' | 'detail' | 'image'

type MaterialChunk = {
  id: string
  spotId: string
  spotName: string
  region: string
  world: HeritageSpot['world']
  era: string
  kind: MaterialChunkKind
  source: string
  priority: number
  text: string
  normalizedText: string
}

const MATERIAL_CHUNK_SOFT_LIMIT = 180
const MATERIAL_MAX_SPOTS = 3
const MATERIAL_MAX_CHUNKS = 5

const spotIndex = new Map(heritageSpots.map((spot) => [spot.id, spot]))

const materialChunks = heritageSpots.flatMap((spot) => createSpotMaterialChunks(spot))
const chunksBySpotId = new Map<string, MaterialChunk[]>()

for (const chunk of materialChunks) {
  const current = chunksBySpotId.get(chunk.spotId)

  if (current) {
    current.push(chunk)
  } else {
    chunksBySpotId.set(chunk.spotId, [chunk])
  }
}

function normalizeSearchText(text: string) {
  return text.toLowerCase().replace(/\s+/g, '')
}

function normalizeMaterialText(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\uFEFF/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

function clipText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}...`
}

function buildQueryTerms(input: string) {
  const normalized = input.trim()
  const compact = normalizeSearchText(normalized)
  const terms = new Set<string>()
  const stopTerms = new Set([
    '一个',
    '一下',
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
    '一下子',
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

function splitParagraph(paragraph: string) {
  const normalized = paragraph.replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return []
  }

  const sentenceMatches = normalized.match(/[^。！？；]+[。！？；]?/gu) ?? [normalized]
  const segments: string[] = []
  let current = ''

  for (const sentence of sentenceMatches) {
    if (!sentence) {
      continue
    }

    if (!current) {
      current = sentence
      continue
    }

    if ((current + sentence).length <= MATERIAL_CHUNK_SOFT_LIMIT) {
      current += sentence
      continue
    }

    segments.push(current)
    current = sentence
  }

  if (current) {
    segments.push(current)
  }

  return segments.flatMap((segment) => {
    if (segment.length <= MATERIAL_CHUNK_SOFT_LIMIT + 24) {
      return [segment]
    }

    const fallbackSegments: string[] = []

    for (let index = 0; index < segment.length; index += MATERIAL_CHUNK_SOFT_LIMIT) {
      fallbackSegments.push(segment.slice(index, index + MATERIAL_CHUNK_SOFT_LIMIT))
    }

    return fallbackSegments
  })
}

function splitLongText(text: string) {
  const paragraphs = normalizeMaterialText(text).split(/\n+/).filter(Boolean)

  if (!paragraphs.length) {
    return []
  }

  return paragraphs.flatMap((paragraph) => splitParagraph(paragraph))
}

function createChunk(
  spot: HeritageSpot,
  kind: MaterialChunkKind,
  source: string,
  priority: number,
  text: string,
  suffix: string,
): MaterialChunk {
  const normalizedText = normalizeMaterialText(text)

  return {
    id: `${spot.id}:${suffix}`,
    spotId: spot.id,
    spotName: spot.name,
    region: spot.region,
    world: spot.world,
    era: spot.era,
    kind,
    source,
    priority,
    text: normalizedText,
    normalizedText: normalizeSearchText(
      [spot.name, spot.region, spot.world, spot.era, source, normalizedText].join(' '),
    ),
  }
}

function createSpotMaterialChunks(spot: HeritageSpot) {
  const chunks: MaterialChunk[] = []

  chunks.push(
    createChunk(
      spot,
      'summary',
      'overview',
      32,
      `${spot.name}，位于${spot.region}，${spot.description}亮点在于${spot.highlight}。`,
      'summary',
    ),
  )

  chunks.push(
    createChunk(
      spot,
      'summary',
      'excerpt',
      26,
      `${spot.name}的时代线索是${spot.era}，可先抓住${clipText(spot.excerpt || spot.description, 88)}。`,
      'excerpt',
    ),
  )

  splitLongText(spot.fullText)
    .slice(0, 8)
    .forEach((segment, index) => {
      chunks.push(
        createChunk(spot, 'detail', `fulltext-${index + 1}`, 18 - index, segment, `detail-${index + 1}`),
      )
    })

  if (spot.images.length) {
    const captions = spot.images
      .map((image) => image.caption.trim())
      .filter(Boolean)
      .slice(0, 6)

    if (captions.length) {
      chunks.push(
        createChunk(
          spot,
          'image',
          'images',
          20,
          `${spot.name}相关图像包括：${captions.join('、')}。`,
          'images',
        ),
      )
    }
  }

  return chunks
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

function detectMentionedSpotIds(input: string) {
  const normalizedInput = normalizeSearchText(input)
  const matched = new Set<string>()

  for (const spot of heritageSpots) {
    const normalizedName = normalizeSearchText(spot.name)
    const normalizedRegion = normalizeSearchText(spot.region)

    if (
      normalizedInput.includes(normalizedName) ||
      (normalizedRegion.length >= 2 && normalizedInput.includes(normalizedRegion))
    ) {
      matched.add(spot.id)
    }
  }

  return matched
}

function buildCandidateSpotIds(request: GuideRequest, currentSpot: HeritageSpot | null, queryTerms: string[]) {
  const candidates = new Set<string>()
  const activeRoute = request.guideBundle.routeCatalog.find((route) => route.id === request.activeRouteId)
  const mentionedSpotIds = detectMentionedSpotIds(request.input)
  const memoryContext = getPublicMemoryContext(request)

  for (const spotId of mentionedSpotIds) {
    candidates.add(spotId)
  }

  if (currentSpot) {
    candidates.add(currentSpot.id)

    for (const relatedId of currentSpot.related) {
      candidates.add(relatedId)
    }
  }

  if (activeRoute) {
    for (const spotId of activeRoute.spotIds) {
      candidates.add(spotId)
    }
  }

  if (request.visitedSpotIds.length) {
    for (const spotId of request.visitedSpotIds.slice(-4)) {
      candidates.add(spotId)
    }
  }

  if (currentSpot) {
    for (const spot of heritageSpots) {
      if (spot.world === currentSpot.world) {
        candidates.add(spot.id)
      }
    }
  }

  for (const spotId of memoryContext.spotBoosts.keys()) {
    candidates.add(spotId)
  }

  if (!candidates.size && queryTerms.length) {
    const rankedByMetadata = heritageSpots
      .map((spot) => ({
        spot,
        score: queryTerms.reduce((score, term) => {
          const text = normalizeSearchText(
            [spot.name, spot.region, spot.era, spot.highlight, spot.description, spot.excerpt].join(' '),
          )

          if (!text.includes(term)) {
            return score
          }

          return score + (term.length >= 4 ? 4 : 2)
        }, 0),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)

    for (const entry of rankedByMetadata.slice(0, 4)) {
      candidates.add(entry.spot.id)
    }
  }

  if (!candidates.size) {
    if (currentSpot) {
      candidates.add(currentSpot.id)
    } else {
      heritageSpots.slice(0, 6).forEach((spot) => candidates.add(spot.id))
    }
  }

  return candidates
}

function weightTermHit(term: string) {
  if (term.length >= 6) {
    return 7
  }

  if (term.length >= 4) {
    return 5
  }

  if (term.length === 3) {
    return 3
  }

  return 1
}

function buildChunkScore(
  chunk: MaterialChunk,
  request: GuideRequest,
  currentSpot: HeritageSpot | null,
  queryTerms: string[],
  activeRouteSpotIds: Set<string>,
  mentionedSpotIds: Set<string>,
  spotBoosts: Map<string, number>,
) {
  const normalizedInput = normalizeSearchText(request.input)
  const imageIntent = /(图|图片|照片|实景|古风|素描|彩绘|结构图|怎么看)/u.test(request.input)
  const compareIntent = /(关系|区别|对照|一起看|连着看|相比|比较)/u.test(request.input)
  let score = chunk.priority

  if (currentSpot?.id === chunk.spotId) {
    score += 26
  } else if (currentSpot?.related.includes(chunk.spotId)) {
    score += compareIntent ? 16 : 10
  } else if (currentSpot && spotIndex.get(chunk.spotId)?.world === currentSpot.world) {
    score += 5
  }

  if (activeRouteSpotIds.has(chunk.spotId)) {
    score += 8
  }

  if (request.visitedSpotIds.includes(chunk.spotId)) {
    score += 2
  }

  if (mentionedSpotIds.has(chunk.spotId)) {
    score += 20
  }

  score += spotBoosts.get(chunk.spotId) ?? 0

  if (normalizedInput.includes(normalizeSearchText(chunk.spotName))) {
    score += 18
  }

  if (normalizedInput.includes(normalizeSearchText(chunk.region))) {
    score += 8
  }

  if (request.mode === 'image' && chunk.kind === 'image') {
    score += 12
  } else if (request.mode === 'story' && chunk.kind !== 'image') {
    score += 4
  } else if (request.mode === 'welcome' && chunk.kind === 'summary') {
    score += 4
  }

  if (imageIntent && chunk.kind === 'image') {
    score += 10
  }

  for (const term of queryTerms) {
    if (!chunk.normalizedText.includes(term)) {
      continue
    }

    score += weightTermHit(term)
  }

  if (queryTerms.length === 0 && currentSpot?.id === chunk.spotId && chunk.kind === 'summary') {
    score += 8
  }

  return score
}

function selectTopChunks(
  request: GuideRequest,
  currentSpot: HeritageSpot | null,
  candidateSpotIds: Set<string>,
  queryTerms: string[],
) {
  const memoryContext = getPublicMemoryContext(request)
  const activeRouteSpotIds = new Set(
    request.guideBundle.routeCatalog.find((route) => route.id === request.activeRouteId)?.spotIds ?? [],
  )
  const mentionedSpotIds = detectMentionedSpotIds(request.input)
  const candidates = [...candidateSpotIds]
    .flatMap((spotId) => chunksBySpotId.get(spotId) ?? [])
    .map((chunk) => ({
      chunk,
      score: buildChunkScore(
        chunk,
        request,
        currentSpot,
        queryTerms,
        activeRouteSpotIds,
        mentionedSpotIds,
        memoryContext.spotBoosts,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }

      if (right.chunk.priority !== left.chunk.priority) {
        return right.chunk.priority - left.chunk.priority
      }

      return left.chunk.id.localeCompare(right.chunk.id, 'en')
    })

  const selected: MaterialChunk[] = []
  const usedChunkIds = new Set<string>()
  const usedSpotIds = new Set<string>()
  const chunkCountBySpot = new Map<string, number>()

  for (const entry of candidates) {
    if (usedChunkIds.has(entry.chunk.id)) {
      continue
    }

    const countForSpot = chunkCountBySpot.get(entry.chunk.spotId) ?? 0

    if (countForSpot >= 2) {
      continue
    }

    if (!usedSpotIds.has(entry.chunk.spotId) && usedSpotIds.size >= MATERIAL_MAX_SPOTS) {
      continue
    }

    selected.push(entry.chunk)
    usedChunkIds.add(entry.chunk.id)
    usedSpotIds.add(entry.chunk.spotId)
    chunkCountBySpot.set(entry.chunk.spotId, countForSpot + 1)

    if (selected.length >= MATERIAL_MAX_CHUNKS) {
      break
    }
  }

  if (!selected.length && currentSpot) {
    return (chunksBySpotId.get(currentSpot.id) ?? []).slice(0, 2)
  }

  return selected
}

export function buildRetrievedMaterialText(request: GuideRequest) {
  const currentSpot = getCurrentSpot(request)
  const queryTerms = buildQueryTerms(request.input)
  const candidateSpotIds = buildCandidateSpotIds(request, currentSpot, queryTerms)
  const selectedChunks = selectTopChunks(request, currentSpot, candidateSpotIds, queryTerms)

  if (!selectedChunks.length) {
    return 'No strong internal material match was found. Prefer the current scene context and site-wide spot index.'
  }

  return selectedChunks
    .map((chunk, index) => {
      return [
        `[Material ${index + 1}] ${chunk.spotName} (${chunk.spotId})`,
        `region=${chunk.region} | era=${chunk.era} | source=${chunk.source} | kind=${chunk.kind}`,
        `text=${clipText(chunk.text, 220)}`,
      ].join('\n')
    })
    .join('\n\n')
}
