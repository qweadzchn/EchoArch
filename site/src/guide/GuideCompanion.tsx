import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { HeritageSpot } from '../types'
import {
  createGuideSessionId,
  preloadGuideRuntimeConfig,
  requestGuideReply,
} from './client'
import {
  getArrivalNote,
  getRouteById,
  getSuggestedRoutes,
  guideProfile,
  guideWorldLabels,
} from './content'
import { GUIDE_OPEN_EVENT, type GuideOpenEventDetail } from './events'
import type {
  GuideAction,
  GuideMessage,
  GuideMode,
  GuideRoutePreset,
} from './types'

type GuideCompanionProps = {
  currentSpot: HeritageSpot | null
  currentView: 'home' | 'detail'
  visitedSpotIds: string[]
  allSpots: HeritageSpot[]
  onOpenSpot: (spotId: string) => void
  onGoHome: () => void
}

type WhisperNote = {
  id: string
  title: string
  content: string
}

type SendGuideOptions = {
  addUserMessage?: boolean
  nextActiveRouteId?: string | null
}

type PendingGuideRequest = {
  prompt: string
  mode: GuideMode
  fromUser: boolean
}

type GuideStudyPrompt = {
  id: string
  eyebrow: string
  title: string
  description: string
  prompt: string
  mode: GuideMode
}

type GuideEncounterPrompt = {
  id: string
  label: string
  prompt: string
  mode: GuideMode
}

type GuideAnchorPosition = {
  x: number
  y: number
}

type GuideDockPlacement = {
  horizontal: 'left' | 'center' | 'right'
  vertical: 'above' | 'below'
}

type DragGesture = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
  moved: boolean
}

type GuideNavigationAction = Exclude<GuideAction, { type: 'select_route' }>

const GUIDE_STORAGE_KEY = 'echoarch.guide-anchor'
const GUIDE_TOGGLE_WIDTH = 252
const GUIDE_TOGGLE_HEIGHT = 84
const GUIDE_DRAG_MARGIN = 18
const GUIDE_DRAG_THRESHOLD = 10
const GUIDE_COMPACT_BREAKPOINT = 720

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function clampGuideAnchor(position: GuideAnchorPosition) {
  if (typeof window === 'undefined') {
    return position
  }

  const maxX = Math.max(GUIDE_DRAG_MARGIN, window.innerWidth - GUIDE_TOGGLE_WIDTH - GUIDE_DRAG_MARGIN)
  const maxY = Math.max(GUIDE_DRAG_MARGIN, window.innerHeight - GUIDE_TOGGLE_HEIGHT - GUIDE_DRAG_MARGIN)

  return {
    x: clamp(position.x, GUIDE_DRAG_MARGIN, maxX),
    y: clamp(position.y, GUIDE_DRAG_MARGIN, maxY),
  }
}

function readStoredGuideAnchor() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(GUIDE_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const parsed = JSON.parse(rawValue) as Partial<GuideAnchorPosition>

    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
      return null
    }

    return clampGuideAnchor({
      x: parsed.x,
      y: parsed.y,
    })
  } catch {
    return null
  }
}

function getDefaultGuideAnchor(currentView: 'home' | 'detail') {
  if (typeof window === 'undefined') {
    return {
      x: GUIDE_DRAG_MARGIN,
      y: GUIDE_DRAG_MARGIN,
    }
  }

  void currentView

  const rightX = window.innerWidth - GUIDE_TOGGLE_WIDTH - 28
  const bottomY = window.innerHeight - GUIDE_TOGGLE_HEIGHT - 28

  return clampGuideAnchor({
    x: rightX,
    y: bottomY,
  })
}

function createUserMessage(input: string, mode: GuideMode): GuideMessage {
  return {
    id: `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'user',
    mode,
    content: input,
  }
}

function findLatestUserMessage(messages: GuideMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'user') ?? null
}

function findLatestGuideMessage(messages: GuideMessage[]) {
  return [...messages].reverse().find((message) => message.role === 'guide') ?? null
}

function getGuideArchive(messages: GuideMessage[]) {
  const guideMessages = messages.filter((message) => message.role === 'guide')
  return guideMessages.slice(Math.max(guideMessages.length - 4, 0), guideMessages.length - 1)
}

function getRouteSpots(route: GuideRoutePreset | null, allSpots: HeritageSpot[]) {
  if (!route) {
    return []
  }

  return route.spotIds
    .map((spotId) => allSpots.find((candidate) => candidate.id === spotId))
    .filter((spot): spot is HeritageSpot => spot !== undefined)
}

function getNextRouteSpot(
  routeSpots: HeritageSpot[],
  currentSpot: HeritageSpot | null,
  visitedSpotIds: string[],
) {
  if (routeSpots.length === 0) {
    return null
  }

  if (currentSpot) {
    const currentIndex = routeSpots.findIndex((spot) => spot.id === currentSpot.id)

    if (currentIndex >= 0 && currentIndex < routeSpots.length - 1) {
      return routeSpots[currentIndex + 1]
    }
  }

  return routeSpots.find((spot) => !visitedSpotIds.includes(spot.id)) ?? routeSpots[0]
}

function getDockPlacement(anchorPosition: GuideAnchorPosition): GuideDockPlacement {
  if (typeof window === 'undefined') {
    return {
      horizontal: 'right',
      vertical: 'above',
    }
  }

  const centerY = anchorPosition.y + GUIDE_TOGGLE_HEIGHT / 2

  return {
    horizontal: 'right',
    vertical: centerY < window.innerHeight * 0.32 ? 'below' : 'above',
  }
}

function resolveSuggestedSpots(spotIds: string[] | undefined, allSpots: HeritageSpot[]) {
  if (!spotIds?.length) {
    return []
  }

  return spotIds
    .map((spotId) => allSpots.find((candidate) => candidate.id === spotId))
    .filter((spot): spot is HeritageSpot => spot !== undefined)
}

function resolveGuideNavigationActions(actions: GuideAction[] | undefined) {
  if (!actions?.length) {
    return []
  }

  return actions.filter(
    (action): action is GuideNavigationAction => action.type === 'open_spot' || action.type === 'go_home',
  )
}

function getGuideShortcutCommands(
  currentSpot: HeritageSpot | null,
  nextRouteSpot: HeritageSpot | null,
  activeRoute: GuideRoutePreset | null,
  visibleRoutes: GuideRoutePreset[],
  relatedSpots: HeritageSpot[],
) {
  const commands: string[] = []

  if (currentSpot) {
    if (nextRouteSpot) {
      commands.push(`去${nextRouteSpot.name}`)
    } else if (relatedSpots[0]) {
      commands.push(`去${relatedSpots[0].name}`)
    }

    commands.push('回总览')

    if (activeRoute) {
      commands.push(`沿${activeRoute.title}继续走`)
    } else if (visibleRoutes[0]) {
      commands.push(`走${visibleRoutes[0].title}`)
    }
  } else {
    commands.push('去卫源庙', '去乾隆行宫')

    if (visibleRoutes[0]) {
      commands.push(`走${visibleRoutes[0].title}`)
    }
  }

  return commands.filter((command, index, currentCommands) => currentCommands.indexOf(command) === index)
}

function buildSceneKey(
  currentView: 'home' | 'detail',
  currentSpotId: string | null,
  activeRouteId: string | null,
) {
  return `${currentView}:${currentSpotId ?? 'home'}:${activeRouteId ?? 'free'}`
}

function clipPromptText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}…`
}

function buildPendingReplyCopy(
  pendingRequest: PendingGuideRequest | null,
  currentSpot: HeritageSpot | null,
  activeRoute: GuideRoutePreset | null,
) {
  if (!pendingRequest) {
    return null
  }

  if (!pendingRequest.fromUser) {
    if (currentSpot) {
      return {
        title: `泉上将报 ${currentSpot.name}`,
        content: `我正把 ${currentSpot.name} 眼前这一层景、旧事与去处收成一句，片刻便替你开口。`,
      }
    }

    if (activeRoute) {
      return {
        title: '泉上正为你引路',
        content: `我正沿着「${activeRoute.title}」替你理一理先后脚，让这条线从第一口气就顺起来。`,
      }
    }

    return {
      title: '泉上将起话头',
      content: '我正替你把北岸、湖心、书院与西岸的层次收拢起来，好让这次入园像被人轻轻带进去。',
    }
  }

  if (pendingRequest.mode === 'image') {
    return {
      title: currentSpot ? `泉上正替你看 ${currentSpot.name}` : '泉上正替你看图',
      content: currentSpot
        ? `已记下你想读图。我正把 ${currentSpot.name} 的实景、古风图与素描图并在一处，换成更好懂的看法说给你听。`
        : '已记下你想先学会读总览。我正替你分辨图中方位、气口与适合先行的一线。',
    }
  }

  if (pendingRequest.mode === 'route') {
    return {
      title: '泉上正在辨路',
      content: currentSpot
        ? `已听见你想换一条走法。我正从 ${currentSpot.name} 所在的位置往前后两头理顺，好让转场更自然。`
        : '已听见你想先定走法。我正顺着入园气口替你收一条更稳、更像真游览的路线。',
    }
  }

  return {
    title: '泉上正在应声',
    content: `你刚刚低声说的是「${clipPromptText(pendingRequest.prompt, 24)}」。我正顺着眼前景势接这句话，不会让这一程断下来。`,
  }
}

function buildGuideStudyPrompts(
  currentSpot: HeritageSpot | null,
  activeRoute: GuideRoutePreset | null,
  relatedSpots: HeritageSpot[],
): GuideStudyPrompt[] {
  if (currentSpot) {
    return [
      {
        id: 'detail',
        eyebrow: '细讲',
        title: `细讲 ${currentSpot.name}`,
        description: '把位置、来历、结构看点和为何值得停步看，讲得更细一些。',
        prompt: `请依据当前项目内部资料，详细讲讲${currentSpot.name}，优先说清它的位置、来历、结构看点、与周边关系；如果资料没有直接写到，就明确说明。`,
        mode: 'story',
      },
      {
        id: 'material',
        eyebrow: '资料',
        title: '翻项目资料',
        description: '只依据现有项目资料，把这一处最关键的几层信息提炼出来。',
        prompt: `请翻查当前项目内部资料，把${currentSpot.name}现有资料里最关键的3点讲给我，尽量依据资料原意，不要空泛扩写。`,
        mode: 'ask',
      },
      {
        id: 'image',
        eyebrow: relatedSpots[0] ? '对照' : '图像',
        title: relatedSpots[0] ? `连着看 ${relatedSpots[0].name}` : '看图说图',
        description: relatedSpots[0]
          ? `把 ${currentSpot.name} 和 ${relatedSpots[0].name} 放在一条线上看，讲讲它们如何互相引。`
          : '从实景、古风图和素描图三个角度，教我如何看懂这一处。',
        prompt: relatedSpots[0]
          ? `请依据项目内部资料，讲讲${currentSpot.name}和${relatedSpots[0].name}之间的关系，它们在游览节奏上为什么适合连着看。`
          : `请依据项目内部资料和当前图像，讲讲${currentSpot.name}的实景图、古风图、素描图分别该怎么看。`,
        mode: relatedSpots[0] ? 'route' : 'image',
      },
    ]
  }

  if (activeRoute) {
    return [
      {
        id: 'route-detail',
        eyebrow: '路引',
        title: `细看「${activeRoute.title}」`,
        description: '讲清这条线为什么这样走，哪里该先收、哪里该后放。',
        prompt: `请依据当前项目内部资料，详细介绍「${activeRoute.title}」这条路线为什么这样安排，沿途最值得停下来的点分别是什么。`,
        mode: 'route',
      },
      {
        id: 'route-material',
        eyebrow: '资料',
        title: '翻路线资料',
        description: '先按现有资料，把这条线里最关键的几站和关系梳理出来。',
        prompt: `请依据当前项目内部资料，概括「${activeRoute.title}」这条路线最关键的3个看点，并说明它们之间的空间转场关系。`,
        mode: 'ask',
      },
      {
        id: 'route-image',
        eyebrow: '图法',
        title: '看总览图法',
        description: '从总览里辨认这一线的起承转合，先把全局方位看清。',
        prompt: `请结合当前总览与项目内部资料，教我怎么在图上看懂「${activeRoute.title}」这条线的起点、转场和收束。`,
        mode: 'image',
      },
    ]
  }

  return [
    {
      id: 'home-pick',
      eyebrow: '细讲',
      title: '先细看一处',
      description: '别先泛泛而谈，替我挑一处最适合第一次入园细听的地方。',
      prompt: '请依据当前项目内部资料，替我挑出最适合第一次入园先细听的一处，并详细说明为什么适合从这里开始。',
      mode: 'welcome',
    },
    {
      id: 'home-material',
      eyebrow: '资料',
      title: '翻项目资料',
      description: '先把整组古建筑最值得知道的三层信息翻给我看。',
      prompt: '请依据当前项目内部资料，概括百泉古建筑群最值得先知道的3件事，尽量具体，不要泛泛抒情。',
      mode: 'ask',
    },
    {
      id: 'home-image',
      eyebrow: '图法',
      title: '看总览图法',
      description: '先教我怎么读这张总览图，哪里是门庭，哪里是水心，哪里适合先走。',
      prompt: '请依据当前总览图和项目内部资料，教我怎么快速读懂这张总览图的方位、气口和推荐起步路线。',
      mode: 'image',
    },
  ]
}

function buildGuideEncounterPrompts(
  currentSpot: HeritageSpot | null,
  activeRoute: GuideRoutePreset | null,
): GuideEncounterPrompt[] {
  if (currentSpot) {
    return [
      {
        id: 'detail-focus',
        label: '这处最该看哪个细部',
        prompt: `如果我现在站在${currentSpot.name}前，最值得先看哪一个细部？请像导游一样指给我看。`,
        mode: 'story',
      },
      {
        id: 'detail-image',
        label: '这张图里先看哪里',
        prompt: `请结合${currentSpot.name}当前图像，告诉我这张图里应该先看哪里，再看哪里。`,
        mode: 'image',
      },
      {
        id: 'detail-material',
        label: '这里有什么容易错过',
        prompt: `依据项目内部资料，讲讲${currentSpot.name}里最容易被游客忽略、但其实很值得看的地方。`,
        mode: 'ask',
      },
    ]
  }

  if (activeRoute) {
    return [
      {
        id: 'route-read-map',
        label: '这条线先看哪一段',
        prompt: `请结合当前总览，告诉我「${activeRoute.title}」这条线应该先看哪一段，为什么。`,
        mode: 'image',
      },
      {
        id: 'route-encounter',
        label: '路上遇到什么值得停',
        prompt: `请依据项目内部资料，告诉我沿着「${activeRoute.title}」走时，路上最值得停下来看的一样东西是什么。`,
        mode: 'route',
      },
      {
        id: 'route-hidden',
        label: '这条线最容易忽略什么',
        prompt: `请依据项目内部资料，讲讲「${activeRoute.title}」这条线里最容易被忽略的一处细节或转场。`,
        mode: 'ask',
      },
    ]
  }

  return [
    {
      id: 'home-overview',
      label: '总览图上先看哪里',
      prompt: '请像站在我身边一样，教我这张总览图上应该先看哪里，再看哪里。',
      mode: 'image',
    },
    {
      id: 'home-object',
      label: '入园最值得先认什么',
      prompt: '如果我是第一次来，刚入园时最值得先认清的一样东西是什么？请像导游一样告诉我。',
      mode: 'welcome',
    },
    {
      id: 'home-hidden',
      label: '这里什么最容易被忽略',
      prompt: '依据项目内部资料，讲讲百泉古建筑群里最容易被第一次游客忽略的一样东西。',
      mode: 'ask',
    },
  ]
}

export function GuideCompanion({
  currentSpot,
  currentView,
  visitedSpotIds,
  allSpots,
  onOpenSpot,
  onGoHome,
}: GuideCompanionProps) {
  const initialAnchorRef = useRef<GuideAnchorPosition | null>(null)

  if (initialAnchorRef.current === null) {
    initialAnchorRef.current = readStoredGuideAnchor() ?? getDefaultGuideAnchor(currentView)
  }

  const [isOpen, setIsOpen] = useState(false)
  const [sessionId] = useState(() => createGuideSessionId())
  const [isPending, setIsPending] = useState(false)
  const [messages, setMessages] = useState<GuideMessage[]>([])
  const [pendingRequest, setPendingRequest] = useState<PendingGuideRequest | null>(null)
  const [input, setInput] = useState('')
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null)
  const [whisper, setWhisper] = useState<WhisperNote | null>(null)
  const [anchorPosition, setAnchorPosition] = useState(initialAnchorRef.current)
  const [hasCustomAnchor, setHasCustomAnchor] = useState(() => readStoredGuideAnchor() !== null)
  const [isCompactViewport, setIsCompactViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= GUIDE_COMPACT_BREAKPOINT,
  )
  const [isDragging, setIsDragging] = useState(false)
  const sheetScrollRef = useRef<HTMLDivElement | null>(null)
  const viewKeyRef = useRef<string | null>(null)
  const narratedSceneRef = useRef<string | null>(null)
  const dragGestureRef = useRef<DragGesture | null>(null)
  const suppressToggleRef = useRef(false)

  const relatedSpots = useMemo(() => {
    if (!currentSpot) {
      return []
    }

    return allSpots.filter((candidate) => currentSpot.related.includes(candidate.id))
  }, [allSpots, currentSpot])

  const activeRoute = useMemo(() => getRouteById(activeRouteId), [activeRouteId])
  const visibleRoutes = useMemo(() => {
    const routes = getSuggestedRoutes(currentSpot)

    if (!activeRoute) {
      return routes
    }

    return [activeRoute, ...routes]
      .filter(
        (route, index, currentRoutes) =>
          currentRoutes.findIndex((candidate) => candidate.id === route.id) === index,
      )
      .slice(0, 4)
  }, [activeRoute, currentSpot])
  const routeSpots = useMemo(() => getRouteSpots(activeRoute, allSpots), [activeRoute, allSpots])
  const nextRouteSpot = getNextRouteSpot(routeSpots, currentSpot, visitedSpotIds)
  const sceneNote = getArrivalNote(currentSpot, activeRoute?.title ?? null)
  const sceneKey = buildSceneKey(currentView, currentSpot?.id ?? null, activeRoute?.id ?? null)
  const latestUserMessage = findLatestUserMessage(messages)
  const latestGuideMessage = findLatestGuideMessage(messages)
  const archivedGuideMessages = getGuideArchive(messages)
  const sceneImage = currentSpot?.images[0]?.src ?? '/landing/overview.jpg'
  const sceneLabel = currentSpot
    ? `${currentSpot.region} · ${guideWorldLabels[currentSpot.world]}`
    : '总览入园'
  const currentModeLabel = activeRoute
    ? `沿「${activeRoute.title}」行游`
    : currentSpot
      ? '就地听讲'
      : '自由漫游'
  const routeProgress = activeRoute
    ? activeRoute.spotIds.filter((spotId) => visitedSpotIds.includes(spotId)).length
    : 0
  const suggestedPrompts =
    latestGuideMessage?.suggestedPrompts?.length
      ? latestGuideMessage.suggestedPrompts
      : currentSpot
        ? guideProfile.detailPrompts
        : guideProfile.defaultPrompts
  const alternateRoutes = activeRoute
    ? visibleRoutes.filter((route) => route.id !== activeRoute.id).slice(0, 2)
    : visibleRoutes
  const routeSuggestionSpots = useMemo(
    () => resolveSuggestedSpots(latestGuideMessage?.suggestedSpotIds, allSpots),
    [allSpots, latestGuideMessage?.suggestedSpotIds],
  )
  const navigationActions = useMemo(
    () => resolveGuideNavigationActions(latestGuideMessage?.actions),
    [latestGuideMessage?.actions],
  )
  const pendingRouteSelection = useMemo(
    () =>
      latestGuideMessage?.actions?.find(
        (action): action is Extract<GuideAction, { type: 'select_route' }> => action.type === 'select_route',
      ) ?? null,
    [latestGuideMessage?.actions],
  )
  const pendingRoute = useMemo(
    () => getRouteById(pendingRouteSelection?.routeId),
    [pendingRouteSelection?.routeId],
  )
  const visitedSpots = useMemo(
    () =>
      visitedSpotIds
        .map((spotId) => allSpots.find((candidate) => candidate.id === spotId))
        .filter((spot): spot is HeritageSpot => spot !== undefined),
    [allSpots, visitedSpotIds],
  )
  const recentVisitedSpots = visitedSpots.slice(Math.max(visitedSpots.length - 5, 0)).reverse()
  const commandShortcuts = useMemo(
    () =>
      getGuideShortcutCommands(
        currentSpot,
        nextRouteSpot,
        activeRoute,
        visibleRoutes,
        relatedSpots,
      ),
    [activeRoute, currentSpot, nextRouteSpot, relatedSpots, visibleRoutes],
  )
  const dockPlacement = useMemo(
    () =>
      isCompactViewport
        ? {
            horizontal: 'center',
            vertical: 'above',
          }
        : getDockPlacement(anchorPosition),
    [anchorPosition, isCompactViewport],
  )
  const floatingStyle = !isCompactViewport
    ? ({
        left: `${anchorPosition.x}px`,
        top: `${anchorPosition.y}px`,
      } satisfies CSSProperties)
    : undefined
  const currentNarrationTitle = latestGuideMessage?.title ?? sceneNote.title
  const currentNarrationContent = latestGuideMessage?.content ?? sceneNote.content
  const pendingReplyCopy = buildPendingReplyCopy(pendingRequest, currentSpot, activeRoute)
  const displayNarrationTitle = isPending && pendingReplyCopy ? pendingReplyCopy.title : currentNarrationTitle
  const displayNarrationContent =
    isPending && pendingReplyCopy ? pendingReplyCopy.content : currentNarrationContent
  const currentUtterance = pendingRequest?.fromUser
    ? pendingRequest.prompt
    : latestUserMessage?.content ?? null
  const studyPrompts = useMemo(
    () => buildGuideStudyPrompts(currentSpot, activeRoute, relatedSpots),
    [activeRoute, currentSpot, relatedSpots],
  )
  const encounterPrompts = useMemo(
    () => buildGuideEncounterPrompts(currentSpot, activeRoute),
    [activeRoute, currentSpot],
  )
  const currentRouteStopIndex =
    activeRoute && currentSpot ? activeRoute.spotIds.findIndex((spotId) => spotId === currentSpot.id) : -1
  const chapterLabel = activeRoute
    ? currentRouteStopIndex >= 0
      ? `第 ${currentRouteStopIndex + 1} 站 / 共 ${activeRoute.spotIds.length} 站`
      : `启行未定 / 共 ${activeRoute.spotIds.length} 站`
    : currentSpot
      ? '驻足细看'
      : '自在入园'
  const footprintsLabel = recentVisitedSpots.length
    ? `已留下 ${visitedSpotIds.length} 枚行迹印`
    : '先让第一处留下印记'
  const toggleSummary = nextRouteSpot
    ? `继续可往 ${nextRouteSpot.name}`
    : currentSpot
      ? `正停在 ${currentSpot.name}`
      : '点开即可入景'

  useEffect(() => {
    void preloadGuideRuntimeConfig()
  }, [])

  const handleExternalGuideOpen = useEffectEvent((detail: GuideOpenEventDetail | undefined) => {
    setIsOpen(true)
    setWhisper(null)

    if (!detail?.prompt) {
      return
    }

    narratedSceneRef.current = sceneKey
    void sendGuideRequest(detail.prompt, detail.mode ?? (currentSpot ? 'story' : 'welcome'), {
      addUserMessage: false,
    })
  })

  useEffect(() => {
    function handleGuideOpen(event: Event) {
      handleExternalGuideOpen((event as CustomEvent<GuideOpenEventDetail>).detail)
    }

    window.addEventListener(GUIDE_OPEN_EVENT, handleGuideOpen)

    return () => {
      window.removeEventListener(GUIDE_OPEN_EVENT, handleGuideOpen)
    }
  }, [])

  useEffect(() => {
    function syncViewportState() {
      const compact = window.innerWidth <= GUIDE_COMPACT_BREAKPOINT
      setIsCompactViewport(compact)
      setAnchorPosition((current) =>
        compact
          ? current
          : hasCustomAnchor
            ? clampGuideAnchor(current)
            : getDefaultGuideAnchor(currentView),
      )
    }

    syncViewportState()
    window.addEventListener('resize', syncViewportState)

    return () => {
      window.removeEventListener('resize', syncViewportState)
    }
  }, [currentView, hasCustomAnchor])

  useEffect(() => {
    if (isCompactViewport || hasCustomAnchor) {
      return
    }

    setAnchorPosition(getDefaultGuideAnchor(currentView))
  }, [currentView, hasCustomAnchor, isCompactViewport])

  useEffect(() => {
    if (typeof window === 'undefined' || !hasCustomAnchor || isCompactViewport) {
      return
    }

    window.localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(clampGuideAnchor(anchorPosition)))
  }, [anchorPosition, hasCustomAnchor, isCompactViewport])

  useEffect(() => {
    if (!isDragging) {
      return
    }

    const previousUserSelect = document.body.style.userSelect
    document.body.style.userSelect = 'none'

    return () => {
      document.body.style.userSelect = previousUserSelect
    }
  }, [isDragging])

  useEffect(() => {
    function finishDrag(pointerId: number) {
      const gesture = dragGestureRef.current

      if (!gesture || gesture.pointerId !== pointerId) {
        return
      }

      dragGestureRef.current = null

      if (gesture.moved) {
        suppressToggleRef.current = true
        window.setTimeout(() => {
          suppressToggleRef.current = false
        }, 120)
      }

      setIsDragging(false)
    }

    function handlePointerMove(event: PointerEvent) {
      if (isCompactViewport) {
        return
      }

      const gesture = dragGestureRef.current

      if (!gesture || event.pointerId !== gesture.pointerId) {
        return
      }

      const deltaX = event.clientX - gesture.startX
      const deltaY = event.clientY - gesture.startY

      if (!gesture.moved && Math.hypot(deltaX, deltaY) > GUIDE_DRAG_THRESHOLD) {
        gesture.moved = true
        setHasCustomAnchor(true)
        setIsDragging(true)
      }

      if (!gesture.moved) {
        return
      }

      setAnchorPosition(
        clampGuideAnchor({
          x: gesture.originX + deltaX,
          y: gesture.originY + deltaY,
        }),
      )
    }

    function handlePointerEnd(event: PointerEvent) {
      finishDrag(event.pointerId)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerEnd)
    window.addEventListener('pointercancel', handlePointerEnd)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerEnd)
      window.removeEventListener('pointercancel', handlePointerEnd)
    }
  }, [isCompactViewport])

  useEffect(() => {
    if (!isOpen || !sheetScrollRef.current) {
      return
    }

    const timer = window.setTimeout(() => {
      sheetScrollRef.current?.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }, isPending ? 40 : 70)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isOpen, isPending, latestGuideMessage?.id])

  useEffect(() => {
    if (isOpen) {
      setWhisper(null)
      return
    }

    if (viewKeyRef.current === sceneKey) {
      return
    }

    viewKeyRef.current = sceneKey

    setWhisper({
      id: sceneKey,
      title: sceneNote.title,
      content: sceneNote.content,
    })

    const timer = window.setTimeout(() => {
      setWhisper((current) => (current?.id === sceneKey ? null : current))
    }, 4800)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isOpen, sceneKey, sceneNote.content, sceneNote.title])

  function executeGuideActions(actions: GuideAction[] | undefined) {
    if (!actions?.length) {
      return
    }

    const hasSpotJump = actions.some((action) => action.type === 'open_spot')
    const selectedRouteAction = actions.find(
      (action): action is Extract<GuideAction, { type: 'select_route' }> => action.type === 'select_route',
    )

    if (selectedRouteAction && !hasSpotJump) {
      narratedSceneRef.current = buildSceneKey(
        currentView,
        currentSpot?.id ?? null,
        selectedRouteAction.routeId,
      )
    }

    setWhisper(null)

    for (const action of actions) {
      if (action.type === 'select_route' && !hasSpotJump) {
        setActiveRouteId(action.routeId)
      }
    }
  }

  function collapseGuideDock() {
    setIsOpen(false)
    setIsArchiveOpen(false)
    setIsComposerOpen(false)
    setWhisper(null)
  }

  function travelToSpot(spotId: string) {
    collapseGuideDock()
    onOpenSpot(spotId)
  }

  function travelToHome() {
    collapseGuideDock()
    onGoHome()
  }

  function handleGuideNavigation(action: GuideNavigationAction) {
    if (action.type === 'open_spot' && pendingRouteSelection) {
      setActiveRouteId(pendingRouteSelection.routeId)
    }

    if (action.type === 'go_home') {
      travelToHome()
      return
    }

    travelToSpot(action.spotId)
  }

  async function sendGuideRequest(
    prompt: string,
    mode: GuideMode,
    options?: SendGuideOptions,
  ) {
    if (isPending) {
      return
    }

    const addUserMessage = options?.addUserMessage ?? true
    const nextActiveRouteId =
      options?.nextActiveRouteId === undefined ? activeRouteId : options.nextActiveRouteId

    if (options?.nextActiveRouteId !== undefined) {
      setActiveRouteId(options.nextActiveRouteId)
    }

    setIsPending(true)
    setPendingRequest({
      prompt,
      mode,
      fromUser: addUserMessage,
    })

    try {
      if (addUserMessage) {
        setMessages((current) => [...current, createUserMessage(prompt, mode)])
        setIsComposerOpen(false)
        setIsArchiveOpen(false)
      }

      const response = await requestGuideReply({
        sessionId,
        input: prompt,
        mode,
        currentView,
        currentSpotId: currentSpot?.id ?? null,
        visitedSpotIds,
        activeRouteId: nextActiveRouteId,
        currentSpot,
        relatedSpots,
      })

      setMessages((current) => [...current, response.reply])
      executeGuideActions(response.reply.actions)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '导游暂时没有回应，请稍后再试。'

      setMessages((current) => [
        ...current,
        {
          id: `guide-error-${Date.now().toString(36)}`,
          role: 'guide',
          mode: 'ask',
          title: '暂时未连通导游服务',
          content: message,
        },
      ])
    } finally {
      setIsPending(false)
      setPendingRequest(null)
    }
  }

  const sendOpeningGuideRequest = useEffectEvent((prompt: string, mode: GuideMode) => {
    narratedSceneRef.current = sceneKey
    void sendGuideRequest(prompt, mode, {
      addUserMessage: false,
    })
  })

  const sendArrivalGuideRequest = useEffectEvent((prompt: string, mode: GuideMode) => {
    narratedSceneRef.current = sceneKey
    void sendGuideRequest(prompt, mode, {
      addUserMessage: false,
    })
  })

  useEffect(() => {
    if (!isOpen || messages.length > 0) {
      return
    }

    const openingPrompt = currentSpot
      ? '请像现场导游报站一样，先带我看看这一处'
      : activeRoute
        ? `请沿着「${activeRoute.title}」替我起个头`
        : '先带我认识这片古建筑群，并给我一个入园感觉'

    sendOpeningGuideRequest(openingPrompt, currentSpot ? 'story' : 'welcome')
  }, [activeRoute, currentSpot, isOpen, messages.length])

  useEffect(() => {
    if (!isOpen || messages.length === 0 || narratedSceneRef.current === sceneKey) {
      return
    }

    const timer = window.setTimeout(() => {
      const prompt = currentSpot
        ? `我们现在到了 ${currentSpot.name}，请像导游报站一样轻讲一段`
        : activeRoute
          ? `请沿着「${activeRoute.title}」继续带我往下走`
          : '请继续带我游览'

      sendArrivalGuideRequest(prompt, currentSpot ? 'story' : 'route')
    }, 220)

    return () => {
      window.clearTimeout(timer)
    }
  }, [activeRoute, currentSpot, isOpen, messages.length, sceneKey])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextInput = input.trim()

    if (!nextInput) {
      return
    }

    setInput('')
    void sendGuideRequest(nextInput, 'ask')
  }

  function handleRouteSelect(route: GuideRoutePreset) {
    if (isPending) {
      return
    }

    setIsArchiveOpen(false)
    setIsComposerOpen(false)
    void sendGuideRequest(route.prompt, 'route', {
      nextActiveRouteId: route.id,
    })
  }

  function handleTogglePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (isCompactViewport || event.button !== 0) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)

    dragGestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: anchorPosition.x,
      originY: anchorPosition.y,
      moved: false,
    }
  }

  function handleToggleClick() {
    if (suppressToggleRef.current || isDragging) {
      return
    }

    setIsOpen((current) => !current)
    setWhisper(null)
  }

  const popupLayer = (
    <>
      {whisper ? (
        <button
          type="button"
          className="guide-broadcast"
          onClick={() => {
            setIsOpen(true)
            setWhisper(null)
          }}
        >
          <span className="guide-broadcast__eyebrow">泉上报站</span>
          <strong>{whisper.title}</strong>
          <p>{whisper.content}</p>
          <small>点开路引，继续跟着走</small>
        </button>
      ) : null}

      <aside className="guide-dock">
        <div className="guide-dock__lead">
          <section
            className="guide-stage"
            style={{ '--accent': currentSpot?.accent ?? '#b8894e' } as CSSProperties}
          >
            <img
              src={sceneImage}
              alt={currentSpot?.images[0]?.alt ?? (currentSpot ? currentSpot.name : '百泉总览')}
              loading="lazy"
              decoding="async"
            />

            <div className="guide-stage__veil" />

            <div className="guide-stage__copy">
              <span>{sceneLabel}</span>
              <h2>{currentSpot ? currentSpot.name : guideProfile.name}</h2>
              <p>{sceneNote.content}</p>
            </div>

            <div className="guide-stage__badge">{currentModeLabel}</div>
          </section>

          <div className="guide-lead__panels">
            <div className="guide-ritual guide-panel">
            <div>
              <span>此刻所至</span>
              <strong>{currentSpot ? currentSpot.name : '百泉总览'}</strong>
            </div>
            <div>
              <span>已行几处</span>
              <strong>
                {activeRoute ? `${routeProgress} / ${activeRoute.spotIds.length}` : `${visitedSpotIds.length} 处`}
              </strong>
            </div>
            <div>
              <span>接下来</span>
              <strong>{nextRouteSpot ? nextRouteSpot.name : '可自由漫游'}</strong>
            </div>
          </div>

          <section className="guide-footprints guide-panel">
            <div className="guide-blockhead">
              <span>行迹印</span>
              <strong>{footprintsLabel}</strong>
            </div>

            {recentVisitedSpots.length > 0 ? (
              <div className="guide-footprints__rail">
                {recentVisitedSpots.map((spot) => (
                  <button
                    key={spot.id}
                    type="button"
                    className={[
                      'guide-footprint',
                      currentSpot?.id === spot.id ? 'is-current' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => travelToSpot(spot.id)}
                  >
                    <span className="guide-footprint__order">
                      {String(spot.order).padStart(2, '0')}
                    </span>
                    <div className="guide-footprint__copy">
                      <strong>{spot.name}</strong>
                      <small>{spot.region}</small>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="guide-footprints__empty">
                还没有留下行迹印。先选一条路，或者让导游替你起个头。
              </div>
            )}
          </section>

          <section className="guide-route guide-panel">
            <div className="guide-blockhead">
              <span>导游路引</span>
              <strong>{activeRoute ? '按线缓行，比问答更像游览' : '先选一条走法'}</strong>
            </div>

            {activeRoute ? (
              <div className="guide-route__stops">
                {routeSpots.map((spot, index) => {
                  const isCurrent = currentSpot?.id === spot.id
                  const isVisited = visitedSpotIds.includes(spot.id)

                  return (
                    <button
                      key={spot.id}
                      type="button"
                      className={[
                        'guide-route__stop',
                        isCurrent ? 'is-current' : '',
                        isVisited ? 'is-visited' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => travelToSpot(spot.id)}
                    >
                      <span className="guide-route__order">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="guide-route__stop-copy">
                        <strong>{spot.name}</strong>
                        <small>{spot.region}</small>
                      </div>
                      <em>{isCurrent ? '此刻' : isVisited ? '已至' : '待行'}</em>
                    </button>
                  )
                })}
              </div>
            ) : (
                <div className="guide-route__cards">
                  {visibleRoutes.map((route, index) => (
                    <button
                      key={route.id}
                      type="button"
                      className="guide-route-card"
                      disabled={isPending}
                      onClick={() => handleRouteSelect(route)}
                    >
                      <span className="guide-route-card__index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="guide-route-card__copy">
                        <small>{route.subtitle}</small>
                        <strong>{route.title}</strong>
                        <p>{route.description}</p>
                      </div>
                      <span className="guide-route-card__stops">
                        {route.spotIds.length} 站
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {alternateRoutes.length > 0 ? (
                <div className="guide-route__alternates">
                  {alternateRoutes.map((route, index) => (
                    <button
                      key={route.id}
                      type="button"
                      className="guide-route-card is-compact"
                      disabled={isPending}
                      onClick={() => handleRouteSelect(route)}
                    >
                      <span className="guide-route-card__index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="guide-route-card__copy">
                        <small>{route.subtitle}</small>
                        <strong>{route.title}</strong>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
          </section>
          </div>
        </div>

        <div className="guide-dock__sheet" ref={sheetScrollRef}>
          <div className="guide-sheet__lead">
            <div className="guide-blockhead">
              <span>当下讲解</span>
              <strong>{displayNarrationTitle}</strong>
            </div>
            <div className="guide-sheet__meta">
              <span>{chapterLabel}</span>
              <span>{activeRoute ? activeRoute.title : sceneLabel}</span>
            </div>
            {currentUtterance ? (
              <div className={['guide-sheet__utterance', isPending ? 'is-pending' : ''].join(' ')}>
                <span>{isPending ? '你刚刚递来一句' : '你方才轻声说'}</span>
                <p>{currentUtterance}</p>
              </div>
            ) : null}
            {isPending ? (
              <div className="guide-sheet__pending-banner" aria-live="polite">
                <span className="guide-sheet__pending-dot" aria-hidden="true" />
                <strong>{pendingReplyCopy?.title ?? '泉上正在应声'}</strong>
                <p>{pendingReplyCopy?.content ?? '我正顺着眼前景势把这一句接住。'}</p>
              </div>
            ) : null}
          </div>

          <article className="guide-sheet" aria-busy={isPending}>
            <div className="guide-sheet__header">
              <span className="guide-sheet__eyebrow">{isPending ? '泉上应声' : '此站报签'}</span>
              <span className="guide-sheet__seal" aria-hidden="true">
                泉
              </span>
            </div>
            <h3>{displayNarrationTitle}</h3>
            <p>{displayNarrationContent}</p>

            <div className="guide-sheet__command-note">
              <span>可直接发话</span>
              <div className="guide-sheet__commands">
                {commandShortcuts.map((command) => (
                  <button
                    key={command}
                    type="button"
                    disabled={isPending}
                    onClick={() => void sendGuideRequest(command, 'ask')}
                  >
                    {command}
                  </button>
                ))}
              </div>
            </div>

            {navigationActions.length > 0 ? (
              <section className="guide-wayfinder">
                <div className="guide-blockhead">
                  <span>路已认好</span>
                  <strong>
                    {pendingRoute ? `已替你收在「${pendingRoute.title}」里` : '点一下就跟着导游转去下一处'}
                  </strong>
                </div>
                <div className="guide-wayfinder__grid">
                  {navigationActions.map((action, index) => {
                    if (action.type === 'go_home') {
                      return (
                        <button
                          key={`guide-jump-home-${index}`}
                          type="button"
                          className="guide-wayfinder__card"
                          onClick={() => handleGuideNavigation(action)}
                        >
                          <small>先退一步</small>
                          <strong>回到总览辨方位</strong>
                          <p>
                            {currentSpot
                              ? `先从 ${currentSpot.name} 退回全局，再看北岸、湖心与书院的去向。`
                              : '先把总览图重新收回眼前，再挑一条更顺脚的走法。'}
                          </p>
                        </button>
                      )
                    }

                    const jumpSpot = allSpots.find((spot) => spot.id === action.spotId)

                    if (!jumpSpot) {
                      return null
                    }

                    return (
                      <button
                        key={`guide-jump-${jumpSpot.id}`}
                        type="button"
                        className="guide-wayfinder__card"
                        onClick={() => handleGuideNavigation(action)}
                      >
                        <small>{pendingRoute ? `顺着「${pendingRoute.title}」` : '导游已认好去处'}</small>
                        <strong>前往 {jumpSpot.name}</strong>
                        <p>
                          {currentSpot
                            ? `从 ${currentSpot.name} 转去 ${jumpSpot.name}，景的收放会更自然。`
                            : `${jumpSpot.name} 适合做此刻第一站，点此便可跟着路引过去。`}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </section>
            ) : null}

            {routeSuggestionSpots.length > 0 ? (
              <div className="guide-sheet__route">
                {routeSuggestionSpots.map((spot) => (
                  <button key={spot.id} type="button" onClick={() => travelToSpot(spot.id)}>
                    去 {spot.name}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="guide-sheet__followups">
              {suggestedPrompts.slice(0, 4).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isPending}
                  onClick={() => void sendGuideRequest(prompt, currentSpot ? 'ask' : 'welcome')}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </article>

          <section className="guide-encounter">
            <div className="guide-blockhead">
              <span>见物可问</span>
              <strong>看见细部、图像、转场、碑刻，都可以直接问导游</strong>
            </div>
            <div className="guide-encounter__chips">
              {encounterPrompts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => void sendGuideRequest(item.prompt, item.mode)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="guide-study">
            <div className="guide-blockhead">
              <span>可深可浅</span>
              <strong>不只问路，也可以翻项目里的现成资料</strong>
            </div>
            <div className="guide-study__grid">
              {studyPrompts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="guide-study-card"
                  disabled={isPending}
                  onClick={() => void sendGuideRequest(item.prompt, item.mode)}
                >
                  <small>{item.eyebrow}</small>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </button>
              ))}
            </div>
          </section>

          <div className="guide-sheet__actions-grid">
            <button
              type="button"
              className="guide-action-card"
              disabled={isPending}
              onClick={() =>
                void sendGuideRequest(
                  currentSpot ? '请像现场导游一样，再报一遍这一站' : '请像导游一样，重新为我开场',
                  currentSpot ? 'story' : 'welcome',
                )
              }
            >
              <small>听此刻</small>
              <strong>重新报站</strong>
              <p>{currentSpot ? '把这一站的引子再轻轻讲一遍。' : '重启入园的第一句。'}</p>
            </button>
            <button
              type="button"
              className="guide-action-card"
              disabled={isPending}
              onClick={() =>
                void sendGuideRequest(
                  currentSpot ? '帮我看看这一处的图像应该怎么读' : '先教我怎么看这张总览图',
                  currentSpot ? 'image' : 'ask',
                )
              }
            >
              <small>看图法</small>
              <strong>看图认景</strong>
              <p>{currentSpot ? '分辨实景、古风图与素描图的看法。' : '先学会读懂总览与点位。'}</p>
            </button>
            {currentSpot ? (
              <button type="button" className="guide-action-card" onClick={travelToHome}>
                <small>退一步</small>
                <strong>回总览</strong>
                <p>退回全局，再看湖心、北岸与书院的走向。</p>
              </button>
            ) : (
              <button
                type="button"
                className="guide-action-card"
                disabled={isPending}
                onClick={() => {
                  if (nextRouteSpot) {
                    travelToSpot(nextRouteSpot.id)
                    return
                  }

                  void sendGuideRequest('请推荐我接下来该怎么走', 'route')
                }}
              >
                <small>启行</small>
                <strong>{nextRouteSpot ? `去 ${nextRouteSpot.name}` : '继续往下走'}</strong>
                <p>{nextRouteSpot ? '顺着当前节奏，直接转去下一站。' : '请导游替你接着往前引。'}</p>
              </button>
            )}
            {currentSpot && nextRouteSpot ? (
              <button
                type="button"
                className="guide-action-card"
                onClick={() => travelToSpot(nextRouteSpot.id)}
              >
                <small>续行</small>
                <strong>去下一站 {nextRouteSpot.name}</strong>
                <p>不久停，沿着这条线往下走，节奏会更顺。</p>
              </button>
            ) : (
              <button
                type="button"
                className="guide-action-card"
                disabled={isPending}
                onClick={() => setIsComposerOpen((current) => !current)}
              >
                <small>私语</small>
                <strong>{isComposerOpen ? '先收起路笺' : '写一张路笺'}</strong>
                <p>改道、追问，或让导游换一种方式陪你看。</p>
              </button>
            )}
          </div>

          <section className="guide-prompts">
            <div className="guide-blockhead">
              <span>顺手一问</span>
              <strong>不必打字很多，挑一句就能继续</strong>
            </div>

            <div className="guide-sheet__prompts">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={isPending}
                  onClick={() => void sendGuideRequest(prompt, currentSpot ? 'ask' : 'welcome')}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </section>

          {archivedGuideMessages.length > 0 ? (
            <section className="guide-archive">
              <div className="guide-blockhead">
                <span>行旅回声</span>
                <strong>不是聊天记录，而是一路留下的几声报站</strong>
              </div>

              <div className={['guide-archive__rail', isArchiveOpen ? 'is-open' : ''].join(' ')}>
                {archivedGuideMessages.map((message) => (
                  <article key={message.id} className="guide-archive__item">
                    <span>{message.title ?? '前一站'}</span>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>

              <button
                type="button"
                className="guide-archive__toggle"
                onClick={() => setIsArchiveOpen((current) => !current)}
              >
                {isArchiveOpen ? '收起前情' : '展开前情'}
              </button>
            </section>
          ) : null}

          <div className="guide-sheet__askbar">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setIsComposerOpen((current) => !current)}
            >
              {isPending ? '导游正在应声' : isComposerOpen ? '先把路笺收起' : '低声问路'}
            </button>
          </div>

          {isComposerOpen ? (
            <form className="guide-composer" onSubmit={handleSubmit}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isPending}
                placeholder={
                  currentSpot
                    ? `写下想改去的地方、想看的图像，或让导游继续讲 ${currentSpot.name}`
                    : '写下想先走哪条线，或让导游替你起个头'
                }
                rows={3}
              />
              <div className="guide-composer__foot">
                <small>
                  例如：{currentSpot ? `带我转去${nextRouteSpot?.name ?? '总览'} / 回总览 / 换条路线` : '去卫源庙 / 走湖心听水 / 先带我入园'}
                </small>
                <button type="submit" disabled={isPending}>
                  {isPending ? '泉上应声中' : '递出路笺'}
                </button>
              </div>
            </form>
          ) : null}

          {isPending ? (
            <div className="guide-sheet__pending" aria-live="polite">
              <span>泉上引游正在回身接话</span>
              <p>{pendingReplyCopy?.content ?? '稍候片刻，我把眼前这一段景与旧事重新替你串一下。'}</p>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  )

  return (
    <div
      className={[
        'guide-companion',
        currentView === 'home' ? 'is-home' : 'is-detail',
        isOpen ? 'is-open' : '',
        isCompactViewport ? 'is-compact' : '',
        `is-align-${dockPlacement.horizontal}`,
        `is-dock-${dockPlacement.vertical}`,
        isPending ? 'is-pending' : '',
        isDragging ? 'is-dragging' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={floatingStyle}
    >
      <button
        type="button"
        className="guide-companion__toggle"
        aria-expanded={isOpen}
        aria-label={isOpen ? '收起导游路引' : '打开导游路引'}
        onPointerDown={handleTogglePointerDown}
        onClick={handleToggleClick}
      >
        <span className="guide-companion__lamp" aria-hidden="true" />

        <span className="guide-companion__toggle-copy">
          <strong>{activeRoute ? activeRoute.title : guideProfile.name}</strong>
          <small>{isPending ? '导游已接话，正替你辨景' : toggleSummary}</small>
          {!isCompactViewport ? (
            <em>{isPending ? '灯影未灭，片刻即回' : isDragging ? '松开即停' : '按住灯笼可挪位'}</em>
          ) : null}
        </span>
      </button>

      <div className="guide-companion__popups">{popupLayer}</div>
    </div>
  )
}
