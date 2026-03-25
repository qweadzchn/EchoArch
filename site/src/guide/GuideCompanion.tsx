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
  const messageEndRef = useRef<HTMLDivElement | null>(null)
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
    if (!messageEndRef.current) {
      return
    }

    messageEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [latestGuideMessage, isArchiveOpen, isComposerOpen, isPending])

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

  function handleGuideNavigation(action: GuideNavigationAction) {
    setIsArchiveOpen(false)

    if (action.type === 'open_spot' && pendingRouteSelection) {
      setActiveRouteId(pendingRouteSelection.routeId)
    }

    if (action.type === 'go_home') {
      onGoHome()
      return
    }

    onOpenSpot(action.spotId)
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

    try {
      if (addUserMessage) {
        setMessages((current) => [...current, createUserMessage(prompt, mode)])
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
                    onClick={() => onOpenSpot(spot.id)}
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
                      onClick={() => onOpenSpot(spot.id)}
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

        <div className="guide-dock__sheet">
          <div className="guide-sheet__lead">
            <div className="guide-blockhead">
              <span>当下讲解</span>
              <strong>{currentNarrationTitle}</strong>
            </div>
            <div className="guide-sheet__meta">
              <span>{chapterLabel}</span>
              <span>{activeRoute ? activeRoute.title : sceneLabel}</span>
            </div>
          </div>

          <article className="guide-sheet">
            <div className="guide-sheet__header">
              <span className="guide-sheet__eyebrow">此站报签</span>
              <span className="guide-sheet__seal" aria-hidden="true">
                泉
              </span>
            </div>
            <h3>{currentNarrationTitle}</h3>
            <p>{currentNarrationContent}</p>

            <div className="guide-sheet__command-note">
              <span>可直接发话</span>
              <div className="guide-sheet__commands">
                {commandShortcuts.map((command) => (
                  <button
                    key={command}
                    type="button"
                    onClick={() => void sendGuideRequest(command, 'ask')}
                  >
                    {command}
                  </button>
                ))}
              </div>
            </div>

            {navigationActions.length > 0 ? (
              <div className="guide-sheet__jump">
                <span>导游建议</span>
                <div className="guide-sheet__route">
                  {navigationActions.map((action, index) => {
                    if (action.type === 'go_home') {
                      return (
                        <button
                          key={`guide-jump-home-${index}`}
                          type="button"
                          onClick={() => handleGuideNavigation(action)}
                        >
                          回到总览再辨方位
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
                        onClick={() => handleGuideNavigation(action)}
                      >
                        前往 {jumpSpot.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {routeSuggestionSpots.length > 0 ? (
              <div className="guide-sheet__route">
                {routeSuggestionSpots.map((spot) => (
                  <button key={spot.id} type="button" onClick={() => onOpenSpot(spot.id)}>
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
                  onClick={() => void sendGuideRequest(prompt, currentSpot ? 'ask' : 'welcome')}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </article>

          <div className="guide-sheet__actions-grid">
            <button
              type="button"
              className="guide-action-card"
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
              <button type="button" className="guide-action-card" onClick={onGoHome}>
                <small>退一步</small>
                <strong>回总览</strong>
                <p>退回全局，再看湖心、北岸与书院的走向。</p>
              </button>
            ) : (
              <button
                type="button"
                className="guide-action-card"
                onClick={() => {
                  if (nextRouteSpot) {
                    onOpenSpot(nextRouteSpot.id)
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
                onClick={() => onOpenSpot(nextRouteSpot.id)}
              >
                <small>续行</small>
                <strong>去下一站 {nextRouteSpot.name}</strong>
                <p>不久停，沿着这条线往下走，节奏会更顺。</p>
              </button>
            ) : (
              <button
                type="button"
                className="guide-action-card"
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
            <button type="button" onClick={() => setIsComposerOpen((current) => !current)}>
              {isComposerOpen ? '先把路笺收起' : '低声问路'}
            </button>
          </div>

          {isComposerOpen ? (
            <form className="guide-composer" onSubmit={handleSubmit}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
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
                  递出路笺
                </button>
              </div>
            </form>
          ) : null}

          {isPending ? (
            <div className="guide-sheet__pending">
              <span>导游正在整理语气</span>
              <p>稍候片刻，我把眼前这一段景与旧事重新替你串一下。</p>
            </div>
          ) : null}

          <div ref={messageEndRef} />
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
          <small>{toggleSummary}</small>
          {!isCompactViewport ? <em>{isDragging ? '松开即停' : '按住灯笼可挪位'}</em> : null}
        </span>
      </button>

      <div className="guide-companion__popups">{popupLayer}</div>
    </div>
  )
}
