import type { HeritageSpot, WorldZone } from '../types'
import type { GuideRoutePreset } from './types'
import experienceRules from './prompts/experience-rules.md?raw'
import persona from './prompts/persona.md?raw'

export const guideProfile = {
  id: 'quanshang-yinyouren',
  name: '泉上引游人',
  subtitle: '不急着回答，先陪你入景',
  opening:
    '若你愿意，我不只为你讲一处建筑，也可以替你把这一园的山水、碑刻与书院文脉慢慢串起来。',
  defaultPrompts: [
    '先带我认识这片古建筑群',
    '推荐一条适合第一次游览的路线',
    '讲讲这里最值得停下来的三处',
  ],
  detailPrompts: [
    '请你讲讲这一处最值得看的地方',
    '这一处和附近建筑有什么关系',
    '如果继续往下走，下一站推荐去哪',
  ],
}

export const guideWorldLabels: Record<WorldZone, string> = {
  'north-shore': '北岸门庭',
  'lake-core': '湖心亭桥',
  'academy-axis': '书院行宫',
  'west-mountain': '西山山径',
}

export const guideRoutes: GuideRoutePreset[] = [
  {
    id: 'first-arrival',
    title: '初入北岸',
    subtitle: '从门庭与古庙缓缓入景',
    description: '先看入园气口，再从门庭、题刻与旧学脉慢慢铺开。',
    prompt: '请带我走一条适合第一次游览的北岸入园线',
    spotIds: ['weiyuan-temple', 'yongjin-pavilion', 'qianlong-palace'],
  },
  {
    id: 'waterfront',
    title: '湖心听水',
    subtitle: '先看亭桥，再看水面与倒影',
    description: '适合先沉进湖心空间，从桥、亭、船房和水光里建立整座园子的节奏。',
    prompt: '请带我走一条偏湖心、水面和亭桥的路线',
    spotIds: ['qinghui-pavilion', 'huxin-pavilion', 'diaoyu-pavilion', 'boat-house'],
  },
  {
    id: 'academy',
    title: '书院回廊',
    subtitle: '从书院旧址走到行宫记忆',
    description: '把读书、讲学与行宫改建放在一条线上看，层次会更清楚。',
    prompt: '请带我走一条偏书院、行宫与旧学脉的路线',
    spotIds: ['south-hall', 'qianlong-palace', 'feishi-stone'],
  },
  {
    id: 'west-mountain',
    title: '西山寻碑',
    subtitle: '沿山径去看祠、窟与碑刻',
    description: '更适合喜欢慢慢拾级而上、顺着人物与碑刻追索文脉的人。',
    prompt: '请带我走一条去西岸山径和碑廊的路线',
    spotIds: ['shao-shrine', 'anlewo', 'stele-corridor', 'efu-tomb'],
  },
]

const worldRouteId: Record<WorldZone, string> = {
  'north-shore': 'first-arrival',
  'lake-core': 'waterfront',
  'academy-axis': 'academy',
  'west-mountain': 'west-mountain',
}

const worldArrivalCopy: Record<WorldZone, string> = {
  'north-shore': '这一带更适合先辨门庭和古庙的气口，再慢慢进入更深处的水景。',
  'lake-core': '这一带不妨先看水面、桥影和亭阁的相互映照，情绪会比资料先到。',
  'academy-axis': '这一带最妙的是书院旧址和行宫记忆叠在一起，越往下看越有回声。',
  'west-mountain': '这一带适合放慢脚步，让山径、祠庙和碑刻自己把文脉串出来。',
}

export const guidePromptBundle = {
  persona,
  experienceRules,
}

export function getRouteById(routeId: string | null | undefined) {
  if (!routeId) {
    return null
  }

  return guideRoutes.find((route) => route.id === routeId) ?? null
}

export function getSuggestedRoutes(currentSpot: HeritageSpot | null) {
  if (!currentSpot) {
    return guideRoutes
  }

  const directRoutes = guideRoutes.filter((route) => route.spotIds.includes(currentSpot.id))
  const primaryRoute = getRouteById(worldRouteId[currentSpot.world])

  return [primaryRoute, ...directRoutes, ...guideRoutes]
    .filter((route, index, routes): route is GuideRoutePreset => {
      return route !== null && routes.findIndex((candidate) => candidate?.id === route.id) === index
    })
    .slice(0, 3)
}

export function getArrivalNote(
  currentSpot: HeritageSpot | null,
  activeRouteTitle: string | null,
) {
  if (!currentSpot) {
    return {
      title: '入园序',
      content: activeRouteTitle
        ? `若想按「${activeRouteTitle}」起行，不妨先在总览图上认一认湖心、门庭与西山的方向，再决定先从哪一口气进入。`
        : '先不用急着逐处点开，不妨先挑一条路，让门庭、水面、书院与山径自己把次序排好。',
    }
  }

  return {
    title: `已至 ${currentSpot.name}`,
    content: activeRouteTitle
      ? `这一站到了 ${currentSpot.name}。先看 ${currentSpot.highlight}，再顺着「${activeRouteTitle}」继续，游览会更有起伏。`
      : `眼前这处是 ${currentSpot.name}。先别急着读满所有资料，先看 ${currentSpot.highlight}。${worldArrivalCopy[currentSpot.world]}`,
  }
}
