import { heritageSpots } from '../data/heritage-data'
import type { HeritageSpot } from '../types'
import { getRouteById, guideProfile, guideRoutes } from './content'
import type {
  GuideAction,
  GuideMessage,
  GuideRequest,
  GuideResponse,
  GuideRoutePreset,
} from './types'

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function getSpotById(spotId: string | null | undefined) {
  return heritageSpots.find((spot) => spot.id === spotId) ?? null
}

function getRelatedSpots(spot: HeritageSpot | null) {
  if (!spot) {
    return []
  }

  return heritageSpots.filter((candidate) => spot.related.includes(candidate.id))
}

function resolveRoute(
  routeId: string | null | undefined,
  currentSpot: HeritageSpot | null,
) {
  const explicitRoute = getRouteById(routeId)

  if (explicitRoute) {
    return explicitRoute
  }

  if (currentSpot) {
    const matchedRoute = guideRoutes.find((route) => route.spotIds.includes(currentSpot.id))

    if (matchedRoute) {
      return matchedRoute
    }
  }

  return guideRoutes[0] ?? null
}

function listSpotNames(route: GuideRoutePreset) {
  return route.spotIds
    .map((spotId) => getSpotById(spotId)?.name)
    .filter(Boolean)
    .join(' → ')
}

function normalizeInput(input: string) {
  return input.replace(/\s+/g, '').trim()
}

function hasSpotNavigationIntent(input: string) {
  return /^(去|到|回|往|进|看|逛|走|带我去|带我到|前往|跳到|打开|进入)/.test(input)
}

function hasRouteIntent(input: string) {
  return /(路线|路引|怎么走|带我逛|带我走|沿着|走一条|游线|线路)/.test(input)
}

function resolveRouteAliases(route: GuideRoutePreset) {
  if (route.id === 'first-arrival') {
    return ['北岸', '初入', '入园']
  }

  if (route.id === 'waterfront') {
    return ['湖心', '水边', '亭桥', '听水']
  }

  if (route.id === 'academy') {
    return ['书院', '行宫', '旧学']
  }

  if (route.id === 'west-mountain') {
    return ['西山', '碑廊', '山径', '寻碑']
  }

  return []
}

function getRouteEntrySpot(route: GuideRoutePreset) {
  return getSpotById(route.spotIds[0] ?? null)
}

function resolveGuideIntent(
  request: GuideRequest,
  currentSpot: HeritageSpot | null,
): {
  message: GuideMessage
  nextRouteId: string | null
} | null {
  const normalizedInput = normalizeInput(request.input)

  if (!normalizedInput) {
    return null
  }

  if (/^(回总览|回首页|返回总览|返回首页|回地图|看总览|回入口)$/.test(normalizedInput)) {
    return {
      nextRouteId: request.activeRouteId ?? null,
      message: {
        id: nextId('guide'),
        role: 'guide',
        mode: 'route',
        title: '回到总览',
        content:
          '先带你回到总览图。站在总览里更容易重新辨认湖心、北岸、书院与西山四个方向，再决定下一步往哪边去。',
        actions: [{ type: 'go_home' }],
        suggestedPrompts: ['带我选一条路线', '先从北岸开始', '我想走湖心听水'],
      },
    }
  }

  const matchedSpot = heritageSpots.find((spot) => {
    if (normalizedInput === spot.name) {
      return true
    }

    return hasSpotNavigationIntent(normalizedInput) && normalizedInput.includes(spot.name)
  })

  if (matchedSpot) {
    const matchingRoute = resolveRoute(request.activeRouteId, matchedSpot)

    return {
      nextRouteId: matchingRoute?.id ?? request.activeRouteId ?? null,
      message: {
        id: nextId('guide'),
        role: 'guide',
        mode: 'route',
        title: `转往 ${matchedSpot.name}`,
        content: `这就带你去 ${matchedSpot.name}。先别急着读满资料，到了那里先看它最醒目的气口：${matchedSpot.highlight}。`,
        actions: [
          ...(matchingRoute ? ([{ type: 'select_route', routeId: matchingRoute.id }] satisfies GuideAction[]) : []),
          { type: 'open_spot', spotId: matchedSpot.id },
        ],
        suggestedPrompts: [
          `到了 ${matchedSpot.name} 后先讲一段`,
          `顺着 ${matchedSpot.name} 再往下走`,
          '回总览再看全局',
        ],
        suggestedSpotIds: [matchedSpot.id, ...matchedSpot.related].slice(0, 3),
      },
    }
  }

  const matchedRoute = guideRoutes.find((route) => {
    if (normalizedInput.includes(route.title.replace(/\s+/g, ''))) {
      return true
    }

    if (normalizedInput.includes(route.subtitle.replace(/\s+/g, ''))) {
      return true
    }

    return resolveRouteAliases(route).some((alias) => normalizedInput.includes(alias))
  })

  if (matchedRoute && (hasRouteIntent(normalizedInput) || normalizedInput === matchedRoute.title)) {
    const entrySpot = getRouteEntrySpot(matchedRoute)

    return {
      nextRouteId: matchedRoute.id,
      message: {
        id: nextId('guide'),
        role: 'guide',
        mode: 'route',
        title: `${matchedRoute.title} · 起行`,
        content: `好，我们改沿「${matchedRoute.title}」走。它更适合 ${matchedRoute.description}${entrySpot ? `我先带你落到 ${entrySpot.name}。` : ''}`,
        actions: [
          { type: 'select_route', routeId: matchedRoute.id },
          ...(entrySpot ? ([{ type: 'open_spot', spotId: entrySpot.id }] satisfies GuideAction[]) : []),
        ],
        suggestedPrompts: ['这条线里哪一处最该久停', '先讲讲这一线的气口', '如果时间不多怎么缩短'],
        suggestedSpotIds: matchedRoute.spotIds.slice(0, 3),
      },
    }
  }

  if (
    currentSpot &&
    /(下一处|下一站|往下走|继续走|带我继续|继续逛)/.test(normalizedInput) &&
    request.activeRouteId
  ) {
    const activeRoute = getRouteById(request.activeRouteId)
    const currentIndex = activeRoute?.spotIds.findIndex((spotId) => spotId === currentSpot.id) ?? -1
    const nextSpotId =
      activeRoute && currentIndex >= 0 && currentIndex < activeRoute.spotIds.length - 1
        ? activeRoute.spotIds[currentIndex + 1]
        : null
    const nextSpot = getSpotById(nextSpotId)

    if (nextSpot) {
      return {
        nextRouteId: activeRoute?.id ?? request.activeRouteId ?? null,
        message: {
          id: nextId('guide'),
          role: 'guide',
          mode: 'route',
          title: `续行至 ${nextSpot.name}`,
          content: `那我们就不在这里久停，顺着这一线往下去 ${nextSpot.name}，这样游览的节奏会更连贯。`,
          actions: [{ type: 'open_spot', spotId: nextSpot.id }],
          suggestedPrompts: ['到了再为我轻讲一段', '这一线还能怎么走', '回总览看看位置'],
          suggestedSpotIds: [nextSpot.id],
        },
      }
    }
  }

  return null
}

function buildWelcomeReply(request: GuideRequest): GuideMessage {
  const visitedCount = request.visitedSpotIds.length
  const currentSpot = request.currentSpot ?? getSpotById(request.currentSpotId)
  const activeRoute = resolveRoute(request.activeRouteId, currentSpot)
  const intro =
    visitedCount > 0
      ? '你已经在园中停下过几次脚步了，不妨顺着刚才那股兴致，把游线再往前引一程。'
      : '第一次进百泉，最好不要急着逐条读资料，先挑一条路，让山水和建筑自己展开。'
  const routeHint = activeRoute
    ? `若想直接起行，可以先走「${activeRoute.title}」：${activeRoute.description}`
    : '若想先有最直观的入园感，我建议从北岸门庭起步，再慢慢转入湖心。'

  return {
    id: nextId('guide'),
    role: 'guide',
    mode: 'welcome',
    title: '入园开场',
    content: `${intro}${routeHint}。${guideProfile.opening}`,
    suggestedPrompts:
      request.currentView === 'home'
        ? guideProfile.defaultPrompts
        : guideProfile.detailPrompts,
    suggestedSpotIds: activeRoute
      ? activeRoute.spotIds.slice(0, 3)
      : ['weiyuan-temple', 'qinghui-pavilion', 'qianlong-palace'],
  }
}

function buildStoryReply(request: GuideRequest, spot: HeritageSpot): GuideMessage {
  const related = getRelatedSpots(spot)
  const activeRoute = resolveRoute(request.activeRouteId, spot)
  const nextLine = related[0]
    ? `如果你愿意继续往下看，我会建议你下一处去 ${related[0].name}，这样更能看清这一线景脉是怎么接续展开的。`
    : '如果你愿意继续走，我也可以替你接着安排下一处更值得停下来的地方。'
  const routeLine = activeRoute
    ? `若仍沿「${activeRoute.title}」往下走，这一处正好是整条游线里很适合停住细看的节点。`
    : ''

  return {
    id: nextId('guide'),
    role: 'guide',
    mode: 'story',
    title: `${spot.name} · 导览短讲`,
    content: `眼前这一处是 ${spot.name}。它最打动人的地方，不只是“有一座建筑”这么简单，而是 ${spot.description}${spot.excerpt}${routeLine}${nextLine}`,
    suggestedPrompts: [
      '这一处最值得细看哪个细节',
      '这座建筑和附近景点怎么串起来看',
      '把这一处讲得更深入一点',
    ],
    suggestedSpotIds: related.slice(0, 2).map((candidate) => candidate.id),
  }
}

function buildImageReply(spot: HeritageSpot): GuideMessage {
  const captions = spot.images.slice(0, 4).map((image) => image.caption).join('、')

  return {
    id: nextId('guide'),
    role: 'guide',
    mode: 'image',
    title: `${spot.name} · 看图认景`,
    content: `这一处现有的图像里，你可以先把它们当成三种不同观看方式：一种更贴近现场空间感，一种偏意境或复原想象，还有一种更适合观察轮廓与细部。就 ${spot.name} 来说，像 ${captions} 这些图，最适合交替着看，这样你会更容易把“真实建筑”和“心中想象”叠在一起。`,
    suggestedPrompts: [
      '帮我区分这些图像各自适合看什么',
      '如果只看一张，先看哪一张',
      '这一处更适合从建筑还是意境来理解',
    ],
  }
}

function buildRouteReply(
  currentSpot: HeritageSpot | null,
  visitedSpotIds: string[],
  activeRouteId: string | null | undefined,
): GuideMessage {
  const route = resolveRoute(activeRouteId, currentSpot)
  const fallbackRoute = ['weiyuan-temple', 'qinghui-pavilion', 'qianlong-palace']

  if (!route) {
    return {
      id: nextId('guide'),
      role: 'guide',
      mode: 'route',
      title: '一条可直接跟走的游线',
      content:
        '如果想先有清楚的起承转合，可以从卫源庙入景，再折向清晖阁和乾隆行宫，这样能先抓住门庭、水景和书院三重气口。',
      suggestedPrompts: [
        '把这条路线讲得更有画面感一点',
        '给我一条更偏湖心的路线',
        '如果时间只有十分钟，缩成最短路线',
      ],
      suggestedSpotIds: fallbackRoute,
    }
  }

  const visitedCount = route.spotIds.filter((spotId) => visitedSpotIds.includes(spotId)).length
  const arrivalLine = currentSpot ? `你现在已经走到 ${currentSpot.name} 了，` : ''
  const progressLine =
    visitedCount > 0
      ? `你已经走过这条线里的 ${visitedCount} 处，再往下看会更有连续感。`
      : '这条线很适合直接当作第一次进入百泉的起手式。'

  return {
    id: nextId('guide'),
    role: 'guide',
    mode: 'route',
    title: `${route.title} · 行游引路`,
    content: `${arrivalLine}如果想让游览更有起承转合，我建议走「${route.title}」：${route.description}。可以依次看 ${listSpotNames(route)}。${progressLine}`,
    suggestedPrompts: [
      '把这条路线讲得更有画面感一点',
      '这一线里哪一处最值得久停',
      '如果我想更快一点，帮我缩短路线',
    ],
    suggestedSpotIds: route.spotIds,
  }
}

function buildAskReply(request: GuideRequest, spot: HeritageSpot | null): GuideMessage {
  const activeRoute = resolveRoute(request.activeRouteId, spot)

  if (!spot) {
    return {
      id: nextId('guide'),
      role: 'guide',
      mode: 'ask',
      title: '从哪里开始问起',
      content: `你现在还在总览里，我更适合先根据你想走的方向来陪你。若你想先稳妥入门，可以让我从北岸门庭、湖心亭桥、书院行宫、西山山径这四条气口里替你挑一条。你刚刚问的是：“${request.input}”。`,
      suggestedPrompts: guideProfile.defaultPrompts,
      suggestedSpotIds: activeRoute
        ? activeRoute.spotIds.slice(0, 3)
        : ['weiyuan-temple', 'qinghui-pavilion', 'qianlong-palace'],
    }
  }

  const related = getRelatedSpots(spot)
  const relatedText = related[0]
    ? `如果你想把这个问题看得更完整，接下来可以顺着 ${related[0].name} 一起看。`
    : '如果你愿意，我还可以继续把它和周边几处建筑串起来讲。'
  const routeText = activeRoute
    ? `若仍沿「${activeRoute.title}」继续，这一站之后的节奏会更顺。`
    : ''

  return {
    id: nextId('guide'),
    role: 'guide',
    mode: 'ask',
    title: `${spot.name} · 回应你的提问`,
    content: `围绕 ${spot.name} 来看，你刚才的问题是“${request.input}”。结合现有资料，我会先抓住它的核心气质：${spot.highlight}。再往下看，它真正有意思的地方在于 ${spot.description}${routeText}${relatedText}`,
    suggestedPrompts: [
      '换一种更像现场讲解的说法',
      '再补一点历史背景',
      '下一处应该去哪里',
    ],
    suggestedSpotIds: related.slice(0, 2).map((candidate) => candidate.id),
  }
}

export function createMockGuideReply(request: GuideRequest): GuideResponse {
  const currentSpot = request.currentSpot ?? getSpotById(request.currentSpotId)
  const resolvedIntent = resolveGuideIntent(request, currentSpot)

  if (resolvedIntent) {
    return {
      sessionId: request.sessionId,
      reply: resolvedIntent.message,
    }
  }

  let reply: GuideMessage

  if (request.mode === 'welcome') {
    reply = buildWelcomeReply(request)
  } else if (request.mode === 'story' && currentSpot) {
    reply = buildStoryReply(request, currentSpot)
  } else if (request.mode === 'image' && currentSpot) {
    reply = buildImageReply(currentSpot)
  } else if (request.mode === 'route') {
    reply = buildRouteReply(currentSpot, request.visitedSpotIds, request.activeRouteId)
  } else {
    reply = buildAskReply(request, currentSpot)
  }

  return {
    sessionId: request.sessionId,
    reply,
  }
}
