import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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

type LandingPageProps = {
  onNavigate: (path: string) => void
  onOpenGuide: (prompt?: string) => void
}

type OverviewPageProps = {
  visitedSpotIds: string[]
  onNavigate: (path: string) => void
  onOpenGuide: (prompt?: string) => void
  onOpenSpot: (spotId: string) => void
}

type GuidePageProps = {
  onNavigate: (path: string) => void
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
        <div className="ea-section__head">
          <span>入园路径</span>
          <h2>从四条线索入园，各自通向不同的观看深处。</h2>
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
  onNavigate,
  onOpenGuide,
  onOpenSpot,
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
    <div className="ea-route ea-overview">
      <section className="ea-overview__scene">
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
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
