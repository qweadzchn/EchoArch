import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type RefObject,
} from 'react'
import { guideProfile, guideRoutes } from './guide/content'
import { openGuideCompanion } from './guide/events'
import {
  academyEraArticles,
  landingHeroMedia,
  landingIntroParagraphs,
  landingPanels,
  steleCategories,
  storyArticles,
} from './data/ppt-content'
import { OVERVIEW_IMAGE_SIZE } from './overview-layout'
import { Breadcrumbs, ScrollCue } from './ppt-shell'
import {
  createVisitBooking,
  type PublicUser,
  type VisitBooking,
} from './api'
import {
  GUIDE_LANDING_PROMPT,
  HOTSPOT_HIT_PADDING_MAX,
  HOTSPOT_HIT_PADDING_MIN,
  OVERVIEW_IMAGE_SRC,
  createDisplayFrame,
  formatOrder,
  getPanelPath,
  getSpotPath,
  spotById,
  spotsWithLayout,
} from './ppt-router'
import { SpatialModeSwitch } from './world/SpatialModeSwitch'
import type { SpatialGuideContext, SpatialViewMode } from './world/types'

const WorldExperience = lazy(() =>
  import('./world/WorldExperience').then((module) => ({
    default: module.WorldExperience,
  })),
)

type LandingPageProps = {
  onNavigate: (path: string) => void
  onOpenGuide: (prompt?: string) => void
}

type OverviewPageProps = {
  visitedSpotIds: string[]
  spatialMode: SpatialViewMode
  onNavigate: (path: string) => void
  onOpenGuide: (prompt?: string) => void
  onOpenSpot: (spotId: string) => void
  onSpatialModeChange: (mode: SpatialViewMode) => void
  onSpatialContextChange: (context: SpatialGuideContext) => void
}

type GuidePageProps = {
  onNavigate: (path: string) => void
}

type VisitBookingPageProps = {
  initialRouteId?: string
  currentUser: PublicUser | null
  onNavigate: (path: string) => void
  onOpenAccount: () => void
}

type VisitTimeSlot = {
  id: string
  label: string
  flow: '舒缓' | '适中' | '较忙'
  note: string
}

const visitTimeSlots: VisitTimeSlot[] = [
  {
    id: 'early',
    label: '09:00-10:30',
    flow: '舒缓',
    note: '适合从第一站慢慢入园，讲解节奏更完整。',
  },
  {
    id: 'midday',
    label: '10:30-12:00',
    flow: '较忙',
    note: '更适合短线参观，建议提前定好首站。',
  },
  {
    id: 'afternoon',
    label: '14:00-15:30',
    flow: '适中',
    note: '适合书院、湖心或碑廊方向分流游览。',
  },
  {
    id: 'late',
    label: '15:30-17:00',
    flow: '舒缓',
    note: '适合慢走收尾，湖心与西山线更从容。',
  },
]

const visitRouteHints: Record<
  string,
  {
    start: string
    recommendedSlotId: string
    dispersal: string
    wayfinding: string
  }
> = {
  'first-arrival': {
    start: '卫源庙',
    recommendedSlotId: 'early',
    dispersal: '建议早段入园，从北岸门庭先分流，避开总览图附近集中停留。',
    wayfinding: '到园后先认卫源庙，再顺着涌金亭、乾隆行宫完成入园线。',
  },
  waterfront: {
    start: '清晖阁',
    recommendedSlotId: 'late',
    dispersal: '湖心亭桥容易聚集拍照，建议错开上午集中时段，沿水面缓行。',
    wayfinding: '到园后先看清晖阁，再转湖心亭、钓鱼亭和船房。',
  },
  academy: {
    start: '南大厅',
    recommendedSlotId: 'afternoon',
    dispersal: '书院行宫线更适合下午承接客流，从湖心方向自然分散。',
    wayfinding: '到园后先到南大厅，再看乾隆行宫和肺石的书院旧脉。',
  },
  'west-mountain': {
    start: '邵夫子祠',
    recommendedSlotId: 'early',
    dispersal: '西山线适合喜欢慢游的游客，早段上行能减轻主游线压力。',
    wayfinding: '到园后从邵夫子祠起步，沿安乐窝、碑廊、饿夫墓慢慢展开。',
  },
}

function resolveVisitRouteId(routeId: string | undefined): string {
  if (routeId && guideRoutes.some((route) => route.id === routeId)) {
    return routeId
  }

  return guideRoutes[0]?.id ?? 'first-arrival'
}

function getDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDefaultVisitDate() {
  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + 1)
  return getDateInputValue(nextDate)
}

export function LandingPage({ onNavigate, onOpenGuide }: LandingPageProps) {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0)

  useEffect(() => {
    if (landingHeroMedia.videos.length < 2) {
      return
    }

    const timer = window.setInterval(() => {
      setActiveVideoIndex((current) => (current + 1) % landingHeroMedia.videos.length)
    }, 12000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  function scrollToPreface() {
    document.getElementById('landing-preface')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <div className="ea-route ea-landing">
      <section className="ea-landing__hero">
        <div
          className="ea-landing__poster"
          style={{ backgroundImage: `url(${landingHeroMedia.poster})` }}
          aria-hidden="true"
        />
        {landingHeroMedia.videos.map((videoSrc, index) => (
          <video
            key={videoSrc}
            className={`ea-landing__video ${index === activeVideoIndex ? 'is-active' : ''}`}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={landingHeroMedia.poster}
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        ))}
        <div className="ea-landing__veil" />
        <div className="ea-landing__grain" />

        <div className="ea-page-shell ea-landing__hero-inner">
          <div className="ea-landing__copy">
            <span className="ea-kicker">钟灵百泉</span>
            <h1>百泉湖古建筑群</h1>
            <p>
              山门、书院、行宫与亭台沿湖山次第展开。先从总览入园，再循人物、
              书院、碑刻与景点四条线索，慢慢走进这片古建筑群。
            </p>

            <div className="ea-actions">
              <button type="button" onClick={() => onNavigate('/overview')}>
                进入古建总览
              </button>
              <button
                type="button"
                className="is-secondary"
                onClick={() => onOpenGuide(GUIDE_LANDING_PROMPT)}
              >
                请导游迎客
              </button>
              <button type="button" className="is-ghost" onClick={scrollToPreface}>
                向下入园
              </button>
            </div>

            <div className="ea-statline">
              <div>
                <span>{formatOrder(spotsWithLayout.length)}</span>
                <strong>古建点位</strong>
              </div>
              <div>
                <span>{formatOrder(storyArticles.length)}</span>
                <strong>人物旧事</strong>
              </div>
              <div>
                <span>{formatOrder(academyEraArticles.length)}</span>
                <strong>书院节点</strong>
              </div>
              <div>
                <span>{formatOrder(steleCategories.length)}</span>
                <strong>碑刻门类</strong>
              </div>
            </div>
          </div>

          <div className="ea-landing__aside" aria-hidden="true">
            <span>湖山入卷</span>
            <strong>先辨山水格局，再入人物、书院与碑廊。</strong>
            <p>风起水动，光影缓缓轮转，像刚踏入园门时最先感到的那口气。</p>
          </div>
        </div>

        <ScrollCue label="继续入园" targetId="landing-preface" />
      </section>

      <section className="ea-page-shell ea-landing__preface" id="landing-preface">
        <div className="ea-landing__preface-copy">
          <span className="ea-kicker">钟灵百泉</span>
          <h2>湖、山、书院与行宫，在这里彼此映照。</h2>
          {landingIntroParagraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 18)}>{paragraph}</p>
          ))}
        </div>

        <div className="ea-landing__mosaic" aria-label="首页图像组">
          <figure className="is-tall">
            <img src="/ppt/home/intro-1.jpg" alt="百泉湖首页图之一" loading="eager" />
          </figure>
          <figure className="is-wide">
            <img src="/ppt/home/intro-2.jpg" alt="百泉湖首页图之二" loading="lazy" />
          </figure>
          <figure>
            <img src="/ppt/home/intro-3.jpg" alt="百泉湖首页图之三" loading="lazy" />
          </figure>
          <div className="ea-landing__mosaic-note">
            <span>园林气象</span>
            <strong>中州山水与书院文脉，在一园之内相遇。</strong>
          </div>
        </div>
      </section>

      <section className="ea-page-shell ea-section ea-landing__chapters">
        <div className="ea-chapter-intro">
          <div className="ea-section__head">
            <span>入园路径</span>
            <h2>先探访，再由导游带路，最后把到访预约收进账号。</h2>
          </div>
          <p>
            游客模式可以直接进入地图、故事和智能导览；需要线下到访时，再登录保存预约与路线续导。
          </p>
          <div className="ea-chapter-intro__steps" aria-label="探访流程">
            <span>探访</span>
            <span>导游</span>
            <span>预约</span>
          </div>
        </div>

        <div className="ea-chapter-grid">
          {landingPanels.map((panel, index) => (
            <button
              key={panel.id}
              type="button"
              className={`ea-chapter-tile ea-chapter-tile--${panel.id}`}
              onClick={() => onNavigate(getPanelPath(panel.id))}
            >
              <div className="ea-chapter-tile__image">
                <img src={panel.imageSrc} alt={panel.title} loading="lazy" />
              </div>
              <div className="ea-chapter-tile__veil" />
              <div className="ea-chapter-tile__copy">
                <i>{String(index + 1).padStart(2, '0')}</i>
                <span>{panel.subtitle}</span>
                <strong>{panel.title}</strong>
                <p>{panel.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export function OverviewPage({
  visitedSpotIds,
  spatialMode,
  onNavigate,
  onOpenGuide,
  onOpenSpot,
  onSpatialModeChange,
  onSpatialContextChange,
}: OverviewPageProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [displayFrame, setDisplayFrame] = useState(() =>
    createDisplayFrame(1600, 980),
  )
  const [activeSpotId, setActiveSpotId] = useState('')
  const [isOverviewReady, setIsOverviewReady] = useState(false)

  useEffect(() => {
    const node = stageRef.current

    if (!node) {
      return
    }

    let animationFrame = 0

    const updateFrame = () => {
      window.cancelAnimationFrame(animationFrame)
      animationFrame = window.requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect()
        setDisplayFrame((current) => {
          if (
            Math.abs(current.stageWidth - rect.width) < 0.5 &&
            Math.abs(current.stageHeight - rect.height) < 0.5
          ) {
            return current
          }

          return createDisplayFrame(rect.width, rect.height)
        })
      })
    }

    updateFrame()

    const resizeObserver = new ResizeObserver(updateFrame)
    resizeObserver.observe(node)
    window.addEventListener('resize', updateFrame)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateFrame)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const image = new Image()
    image.src = OVERVIEW_IMAGE_SRC

    image
      .decode()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setIsOverviewReady(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const hotspotHitPadding = Math.max(
    HOTSPOT_HIT_PADDING_MIN,
    Math.min(displayFrame.width * 0.012, HOTSPOT_HIT_PADDING_MAX),
  )

  return (
    <div className={`ea-route ea-overview ${spatialMode === '3d' ? 'is-spatial' : ''}`}>
      <section className="ea-overview__scene">
        <SpatialModeSwitch
          className="ea-spatial-switch--overview"
          value={spatialMode}
          onChange={onSpatialModeChange}
        />

        {spatialMode === '3d' ? (
          <Suspense fallback={<div className="ea-world-module-loading" aria-label="正在加载三维场景" />}>
            <WorldExperience
              currentSpotId={null}
              variant="overview"
              onOpenSpot={onOpenSpot}
              onContextChange={onSpatialContextChange}
            />
          </Suspense>
        ) : (
          <OverviewStage
            activeSpotId={activeSpotId}
            displayFrame={displayFrame}
            hotspotHitPadding={hotspotHitPadding}
            isOverviewReady={isOverviewReady}
            onClearActiveSpot={() => setActiveSpotId('')}
            onOpenSpot={onOpenSpot}
            onSetActiveSpot={setActiveSpotId}
            stageRef={stageRef}
            visitedSpotIds={visitedSpotIds}
          />
        )}

        <div className="ea-overview__overlay">
          <div className="ea-page-shell ea-overview__topline">
            <Breadcrumbs
              items={[{ label: '首页', path: '/' }, { label: '总览长卷' }]}
              onNavigate={onNavigate}
            />
            <span className="ea-overview__topline-note">悬停显名，点击入景</span>
          </div>

          <div className="ea-page-shell ea-overview__copy">
            <div className="ea-overview__plaque">
              <span className="ea-kicker">总览长卷</span>
              <h1>百泉古建总览</h1>
              <p>悬停显名，点击入景。</p>
            </div>
          </div>

          <div className="ea-page-shell ea-overview__footer">
            <div className="ea-overview__footer-row">
              <div className="ea-overview__stats">
                <span>{formatOrder(spotsWithLayout.length)} 处古建筑</span>
                <span>{formatOrder(visitedSpotIds.length)} 处已驻足</span>
                <span>悬停建筑区域即可显名</span>
              </div>

              <div className="ea-actions ea-overview__actions">
                <button type="button" onClick={() => onNavigate('/')}>
                  返回首页
                </button>
                <button
                  type="button"
                  className="is-secondary"
                  onClick={() => onOpenGuide('请先站在总览图前，替我辨认方位，再推荐第一站。')}
                >
                  请导游带路
                </button>
                <button type="button" className="is-ghost" onClick={() => onNavigate('/visit')}>
                  预约到访
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function OverviewStage({
  activeSpotId,
  displayFrame,
  hotspotHitPadding,
  isOverviewReady,
  onClearActiveSpot,
  onOpenSpot,
  onSetActiveSpot,
  stageRef,
  visitedSpotIds,
}: {
  activeSpotId: string
  displayFrame: ReturnType<typeof createDisplayFrame>
  hotspotHitPadding: number
  isOverviewReady: boolean
  onClearActiveSpot: () => void
  onOpenSpot: (spotId: string) => void
  onSetActiveSpot: (spotId: string) => void
  stageRef: RefObject<HTMLDivElement | null>
  visitedSpotIds: string[]
}) {
  return (
    <div
      ref={stageRef}
      className={`ea-overview__stage ${isOverviewReady ? 'is-ready' : ''}`}
      onPointerLeave={onClearActiveSpot}
    >
      <img
        className="ea-overview__image"
        src={OVERVIEW_IMAGE_SRC}
        alt="百泉古建筑群总览图"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        style={{
          left: displayFrame.left,
          top: displayFrame.top,
          width: displayFrame.width,
          height: displayFrame.height,
        }}
      />
      <div className="ea-overview__shade" />

      {spotsWithLayout.map((spot) => {
        const left = (spot.layout.x / OVERVIEW_IMAGE_SIZE.width) * displayFrame.width
        const top = (spot.layout.y / OVERVIEW_IMAGE_SIZE.height) * displayFrame.height
        const boxWidth =
          (spot.layout.width / OVERVIEW_IMAGE_SIZE.width) * displayFrame.width
        const boxHeight =
          (spot.layout.height / OVERVIEW_IMAGE_SIZE.height) * displayFrame.height
        const width = boxWidth + hotspotHitPadding * 2
        const height = boxHeight + hotspotHitPadding * 2
        const points = spot.layout.points
          .map((point) => {
            const pointX =
              ((point.x - spot.layout.x) / spot.layout.width) * boxWidth +
              hotspotHitPadding
            const pointY =
              ((point.y - spot.layout.y) / spot.layout.height) * boxHeight +
              hotspotHitPadding

            return `${pointX},${pointY}`
          })
          .join(' ')

        return (
          <button
            key={spot.id}
            type="button"
            aria-label={`查看 ${spot.name}`}
            className={[
              'ea-overview__hotspot',
              spot.id === activeSpotId ? 'is-active' : '',
              top < displayFrame.height * 0.16 ? 'is-label-below' : '',
              visitedSpotIds.includes(spot.id) ? 'is-visited' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={
              {
                left: displayFrame.left + left - hotspotHitPadding,
                top: displayFrame.top + top - hotspotHitPadding,
                width,
                height,
                '--spot-accent': spot.accent,
              } as CSSProperties
            }
            onClick={() => onOpenSpot(spot.id)}
            onBlur={onClearActiveSpot}
            onFocus={() => onSetActiveSpot(spot.id)}
            onPointerEnter={() => onSetActiveSpot(spot.id)}
            onPointerLeave={onClearActiveSpot}
          >
            <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
              <polygon points={points} />
            </svg>
            <span className="ea-overview__label">{spot.name}</span>
          </button>
        )
      })}
    </div>
  )
}

export function GuidePage({ onNavigate }: GuidePageProps) {
  const hasOpenedRef = useRef(false)

  useEffect(() => {
    if (hasOpenedRef.current) {
      return
    }

    hasOpenedRef.current = true
    const timer = window.setTimeout(() => {
      openGuideCompanion({ mode: 'welcome', prompt: GUIDE_LANDING_PROMPT })
    }, 180)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="ea-route ea-guide">
      <section className="ea-page-shell ea-banner ea-banner--guide">
        <Breadcrumbs
          items={[{ label: '首页', path: '/' }, { label: '智能导览' }]}
          onNavigate={onNavigate}
        />
        <div className="ea-banner__copy">
          <span className="ea-kicker">智能导览</span>
          <h1>{guideProfile.name}</h1>
          <p>{guideProfile.opening}</p>
          <div className="ea-actions">
            <button
              type="button"
              onClick={() =>
                openGuideCompanion({ mode: 'welcome', prompt: GUIDE_LANDING_PROMPT })
              }
            >
              打开导游对话
            </button>
            <button
              type="button"
              className="is-secondary"
              onClick={() => onNavigate('/overview')}
            >
              先看地图总览
            </button>
          </div>
        </div>
      </section>

      <section className="ea-page-shell ea-guide__layout">
        <article className="ea-panel ea-guide__persona">
          <div className="ea-guide__stage">
            <img src="/ppt/home/intro-3.jpg" alt="百泉导览意向图" loading="lazy" />
          </div>
          <div className="ea-guide__copy">
            <span>{guideProfile.subtitle}</span>
            <h2>让导览替你择路，而不是只回答问题。</h2>
            <p>
              它既能讲眼前这一处，也能把人物、碑刻、书院与湖山之间的关系慢慢串起来。
              你可以把它当作真正的入园讲解员。
            </p>
            <div className="ea-prompt-grid">
              {guideProfile.defaultPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => openGuideCompanion({ mode: 'ask', prompt })}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </article>

        <div className="ea-guide__routes">
          {guideRoutes.map((route) => {
            const firstSpot = route.spotIds
              .map((spotId) => spotById.get(spotId))
              .find((spot) => spot !== undefined)

            return (
              <article key={route.id} className="ea-panel ea-guide-route">
                <span>{route.subtitle}</span>
                <h3>{route.title}</h3>
                <p>{route.description}</p>
                <div className="ea-pill-row">
                  {route.spotIds
                    .map((spotId) => spotById.get(spotId))
                    .filter((spot): spot is NonNullable<typeof spot> => spot !== undefined)
                    .map((spot) => (
                      <span key={spot.id}>{spot.name}</span>
                    ))}
                </div>
                <div className="ea-actions">
                  <button
                    type="button"
                    onClick={() => openGuideCompanion({ mode: 'route', prompt: route.prompt })}
                  >
                    以此路线开讲
                  </button>
                  {firstSpot ? (
                    <button
                      type="button"
                      className="is-secondary"
                      onClick={() => onNavigate(getSpotPath(firstSpot.id))}
                    >
                      直接前往首站
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="is-ghost"
                    onClick={() => onNavigate(`/visit/${route.id}`)}
                  >
                    线下走这条线
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export function VisitBookingPage({
  initialRouteId,
  currentUser,
  onNavigate,
  onOpenAccount,
}: VisitBookingPageProps) {
  const [selectedRouteId, setSelectedRouteId] = useState(() => resolveVisitRouteId(initialRouteId))
  const [visitDate, setVisitDate] = useState(() => getDefaultVisitDate())
  const [selectedSlotId, setSelectedSlotId] = useState(() => {
    const routeId = resolveVisitRouteId(initialRouteId)
    return visitRouteHints[routeId]?.recommendedSlotId ?? visitTimeSlots[0]?.id ?? ''
  })
  const [visitorCount, setVisitorCount] = useState(2)
  const [contact, setContact] = useState('')
  const [note, setNote] = useState('')
  const [submittedBooking, setSubmittedBooking] = useState<VisitBooking | null>(null)
  const [submitMessage, setSubmitMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedRoute = guideRoutes.find((route) => route.id === selectedRouteId) ?? guideRoutes[0]
  const selectedHint = visitRouteHints[selectedRoute?.id ?? ''] ?? visitRouteHints['first-arrival']
  const selectedSlot =
    visitTimeSlots.find((slot) => slot.id === selectedSlotId) ?? visitTimeSlots[0]
  const routeSpots = selectedRoute
    ? selectedRoute.spotIds
        .map((spotId) => spotById.get(spotId))
        .filter((spot): spot is NonNullable<typeof spot> => spot !== undefined)
    : []
  const isRecommendedSlot = selectedSlot?.id === selectedHint.recommendedSlotId
  const todayValue = getDateInputValue(new Date())

  function handleRouteSelect(routeId: string) {
    setSelectedRouteId(routeId)
    setSelectedSlotId(visitRouteHints[routeId]?.recommendedSlotId ?? selectedSlotId)
    setSubmittedBooking(null)
    setSubmitMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedRoute || !selectedSlot) {
      return
    }

    if (!currentUser) {
      setSubmitMessage('预约会保存到账号里，请先登录或注册后再提交。')
      onOpenAccount()
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      const result = await createVisitBooking({
        routeId: selectedRoute.id,
        visitDate,
        timeSlotId: selectedSlot.id,
        timeSlotLabel: selectedSlot.label,
        visitorCount,
        contact: contact.trim(),
        note: note.trim(),
      })

      setSubmittedBooking(result.booking)
      setSubmitMessage('预约意向已提交，后续可在账号面板里查看状态。')
    } catch (error) {
      setSubmitMessage(error instanceof Error ? error.message : '预约提交失败，请稍后再试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="ea-route ea-visit">
      <section className="ea-page-shell ea-banner ea-banner--visit">
        <Breadcrumbs
          items={[{ label: '首页', path: '/' }, { label: '预约到访' }]}
          onNavigate={onNavigate}
        />
        <div className="ea-banner__copy">
          <span className="ea-kicker">实地导览预约</span>
          <h1>选好路线再出发</h1>
          <p>
            先定路线、时段和首站，到园后直接接上智能导览，少一点临时找路的犹豫。
          </p>
          <div className="ea-actions">
            <button type="button" onClick={() => onNavigate('/guide')}>
              先听导游推荐
            </button>
            <button type="button" className="is-secondary" onClick={() => onNavigate('/overview')}>
              回地图辨路
            </button>
          </div>
        </div>
        <aside className="ea-visit__hero-note" aria-label="预约到访说明">
          <span>到访小笺</span>
          <strong>路线在前，到访在后</strong>
          <p>先把想走的线收好，再按更从容的时段入园。</p>
          <div>
            <small>分流时段</small>
            <small>首站提示</small>
            <small>路线续导</small>
          </div>
        </aside>
      </section>

      <section className="ea-page-shell ea-visit__layout">
        <form className="ea-panel ea-visit__planner" onSubmit={handleSubmit}>
          <div className={currentUser ? 'ea-visit-account is-signed' : 'ea-visit-account'}>
            <div>
              <span>{currentUser ? '预约账号' : '游客探访'}</span>
              <strong>{currentUser ? currentUser.displayName : '登录后保存预约与导游续接'}</strong>
              <p>
                {currentUser
                  ? '这次预约会记录到你的账号，之后可在账户面板里查看状态。'
                  : '可以先浏览和问导游；提交预约时需要登录，方便保存到访信息。'}
              </p>
            </div>
            <button type="button" onClick={onOpenAccount}>
              {currentUser ? '查看账号' : '登录 / 注册'}
            </button>
          </div>

          <div className="ea-visit__section-head">
            <span>路线选择</span>
            <h2>先定一条不会迷路的走法</h2>
          </div>

          <div className="ea-visit__route-grid">
            {guideRoutes.map((route) => (
              <button
                key={route.id}
                type="button"
                className={route.id === selectedRouteId ? 'is-active' : undefined}
                onClick={() => handleRouteSelect(route.id)}
              >
                <small>{route.subtitle}</small>
                <strong>{route.title}</strong>
                <span>{route.spotIds.length} 站</span>
              </button>
            ))}
          </div>

          <div className="ea-visit__fields">
            <label>
              <span>到访日期</span>
              <input
                type="date"
                min={todayValue}
                value={visitDate}
                onChange={(event) => {
                  setVisitDate(event.target.value)
                  setSubmittedBooking(null)
                  setSubmitMessage('')
                }}
                required
              />
            </label>

            <label>
              <span>同行人数</span>
              <input
                type="number"
                min={1}
                max={20}
                value={visitorCount}
                onChange={(event) => {
                  setVisitorCount(Number(event.target.value))
                  setSubmittedBooking(null)
                  setSubmitMessage('')
                }}
                required
              />
            </label>

            <label>
              <span>联系方式</span>
              <input
                type="text"
                value={contact}
                placeholder="手机号或微信号"
                onChange={(event) => {
                  setContact(event.target.value)
                  setSubmittedBooking(null)
                  setSubmitMessage('')
                }}
                required
              />
            </label>
          </div>

          <div className="ea-visit__section-head is-compact">
            <span>分流时段</span>
            <h2>优先选择更从容的入园时间</h2>
          </div>

          <div className="ea-visit__slot-grid" role="radiogroup" aria-label="选择到访时段">
            {visitTimeSlots.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className={[
                  slot.id === selectedSlotId ? 'is-active' : '',
                  slot.id === selectedHint.recommendedSlotId ? 'is-recommended' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  setSelectedSlotId(slot.id)
                  setSubmittedBooking(null)
                  setSubmitMessage('')
                }}
              >
                <strong>{slot.label}</strong>
                <span>{slot.flow}</span>
                <p>{slot.note}</p>
              </button>
            ))}
          </div>

          <label className="ea-visit__note">
            <span>补充说明</span>
            <textarea
              value={note}
              rows={3}
              placeholder="例如：带老人同行、想重点看碑刻、希望慢一点讲"
              onChange={(event) => {
                setNote(event.target.value)
                setSubmittedBooking(null)
                setSubmitMessage('')
              }}
            />
          </label>

          <div className="ea-visit__submit">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '提交中' : currentUser ? '提交到访意向' : '登录后提交预约'}
            </button>
            <p>
              {submitMessage ||
              (isRecommendedSlot
                ? '当前时段与路线分流建议匹配。'
                : `这条线更推荐 ${visitTimeSlots.find((slot) => slot.id === selectedHint.recommendedSlotId)?.label ?? '较舒缓时段'}，现场会更从容。`)}
            </p>
          </div>
        </form>

        <aside className="ea-panel ea-visit__side">
          <section className="ea-visit-card">
            <span>路线小卡</span>
            <h2>{selectedRoute?.title}</h2>
            <p>{selectedRoute?.description}</p>
            <div className="ea-visit-card__stops">
              {routeSpots.map((spot, index) => (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => onNavigate(getSpotPath(spot.id))}
                >
                  <i>{String(index + 1).padStart(2, '0')}</i>
                  <strong>{spot.name}</strong>
                  <small>{spot.region}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="ea-visit-card is-soft">
            <span>分流建议</span>
            <h2>从 {selectedHint.start} 起步</h2>
            <p>{selectedHint.dispersal}</p>
            <p>{selectedHint.wayfinding}</p>
          </section>

          {submittedBooking ? (
            <section className="ea-visit-confirm">
              <span>预约意向已记录</span>
              <strong>{submittedBooking.bookingNo}</strong>
              <p>
                {submittedBooking.visitDate}，{submittedBooking.timeSlotLabel}，
                {submittedBooking.visitorCount} 人。
                到园后可先打开智能导览，按「{selectedRoute?.title}」继续走。
              </p>
              <button
                type="button"
                onClick={() =>
                  openGuideCompanion({
                    mode: 'route',
                    prompt: `我已经预约了${selectedRoute?.title}，到园后请按这条线提醒我先从哪里走。`,
                  })
                }
              >
                让导游记住这条线
              </button>
            </section>
          ) : null}
        </aside>
      </section>
    </div>
  )
}
