import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import './ppt-shell.css'
import './ppt-pages.css'
import {
  AcademyEraPage,
  AcademyHubPage,
  SteleDetailPage,
  SteleHubPage,
} from './ppt-culture-pages'
import { GuidePage, LandingPage, OverviewPage } from './ppt-entry-pages'
import { SiteHeader } from './ppt-shell'
import { StoryDetailPage, StoryHubPage } from './ppt-story-pages'
import {
  GUIDE_LANDING_PROMPT,
  academyById,
  getActiveNav,
  getSpotPath,
  readRouteFromHash,
  steleById,
  storyById,
  type AppRoute,
} from './ppt-router'
import {
  homeHeroChapters,
  homeIntroParagraphs,
  homeIntroStats,
  homeSteleEntries,
  homeStoryEntries,
  homeTimelineEntries,
  homeTimelineLead,
} from './data/home-content'
import { steleCategories, storyArticles } from './data/ppt-content'
import { heritageSpots } from './data/heritage-data'
import { openGuideCompanion } from './guide/events'
import {
  OVERVIEW_IMAGE_SIZE,
  overviewLayoutBySpotId,
  type HotspotLayout,
} from './overview-layout'
import type { HeritageSpot } from './types'

const GuideCompanion = lazy(() =>
  import('./guide/GuideCompanion').then((module) => ({
    default: module.GuideCompanion,
  })),
)

type SpotWithLayout = HeritageSpot & {
  layout: HotspotLayout
}

type DisplayFrame = {
  stageWidth: number
  stageHeight: number
  left: number
  top: number
  width: number
  height: number
}

type HotspotGeometry = {
  left: number
  top: number
  width: number
  height: number
  points: string
  centerX: number
  centerY: number
  boxWidth: number
  boxHeight: number
}

const HOTSPOT_HIT_PADDING_MIN = 14
const HOTSPOT_HIT_PADDING_MAX = 26
const OVERVIEW_IMAGE_SRC = '/landing/overview.jpg'
const HOME_SECTION_LINKS = [
  { id: 'intro-section', label: '钟灵百泉' },
  { id: 'stories-section', label: '鸾翔凤集' },
  { id: 'timeline-section', label: '文脉流长' },
] as const

const spotsWithLayout: SpotWithLayout[] = heritageSpots
  .map((spot) => {
    const layout = overviewLayoutBySpotId[spot.id]

    if (!layout) {
      return null
    }

    return {
      ...spot,
      layout,
    }
  })
  .filter((spot): spot is SpotWithLayout => spot !== null)
  .sort((left, right) => left.order - right.order)

function readSpotIdFromHash() {
  const prefix = '#/spot/'

  if (!window.location.hash.startsWith(prefix)) {
    return null
  }

  return decodeURIComponent(window.location.hash.slice(prefix.length))
}

function getValidSpotId(spotId: string | null) {
  if (!spotId) {
    return null
  }

  return spotsWithLayout.some((spot) => spot.id === spotId) ? spotId : null
}

function readValidSpotIdFromHash() {
  return getValidSpotId(readSpotIdFromHash())
}

void [readSpotIdFromHash, getValidSpotId, readValidSpotIdFromHash]

function splitIntoParagraphs(text: string) {
  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length > 1) {
    return paragraphs
  }

  const sentences = text
    .split(/(?<=[.!?。！？])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  const grouped: string[] = []

  for (let index = 0; index < sentences.length; index += 2) {
    grouped.push(sentences.slice(index, index + 2).join(''))
  }

  return grouped
}

function createDisplayFrame(stageWidth: number, stageHeight: number): DisplayFrame {
  const scale = Math.max(
    stageWidth / OVERVIEW_IMAGE_SIZE.width,
    stageHeight / OVERVIEW_IMAGE_SIZE.height,
  )
  const width = OVERVIEW_IMAGE_SIZE.width * scale
  const height = OVERVIEW_IMAGE_SIZE.height * scale

  return {
    stageWidth,
    stageHeight,
    width,
    height,
    left: (stageWidth - width) / 2,
    top: (stageHeight - height) / 2,
  }
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => readRouteFromHash())
  const [visitedSpotIds, setVisitedSpotIds] = useState<string[]>(() => {
    const initialRoute = readRouteFromHash()
    return initialRoute.page === 'spot' ? [initialRoute.spotId] : []
  })
  const [storyPreviewId, setStoryPreviewId] = useState<string>(
    () => {
      const initialRoute = readRouteFromHash()
      return initialRoute.page === 'story'
        ? initialRoute.storyId
        : storyArticles[0]?.id ?? ''
    },
  )
  const [stelePreviewId, setStelePreviewId] = useState<string>(
    () => {
      const initialRoute = readRouteFromHash()
      return initialRoute.page === 'stele'
        ? initialRoute.categoryId
        : steleCategories[0]?.id ?? ''
    },
  )

  useEffect(() => {
    function syncRouteFromHash() {
      const nextRoute = readRouteFromHash()

      setRoute(nextRoute)

      if (nextRoute.page === 'spot') {
        setVisitedSpotIds((current) =>
          current.includes(nextRoute.spotId)
            ? current
            : [...current, nextRoute.spotId],
        )
        return
      }

      if (nextRoute.page === 'story') {
        setStoryPreviewId(nextRoute.storyId)
        return
      }

      if (nextRoute.page === 'stele') {
        setStelePreviewId(nextRoute.categoryId)
      }
    }

    window.addEventListener('hashchange', syncRouteFromHash)

    return () => {
      window.removeEventListener('hashchange', syncRouteFromHash)
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  const currentSpot =
    route.page === 'spot'
      ? spotsWithLayout.find((spot) => spot.id === route.spotId) ?? null
      : null

  function navigateTo(path: string) {
    const nextHash = `#${path}`

    if (window.location.hash !== nextHash) {
      window.location.hash = path
      return
    }

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function openGuide(prompt?: string) {
    openGuideCompanion({
      mode: 'welcome',
      prompt,
    })
  }

  function openSpotById(spotId: string) {
    const nextSpot = spotsWithLayout.find((spot) => spot.id === spotId)

    if (!nextSpot) {
      return
    }

    navigateTo(getSpotPath(nextSpot.id))
  }

  function openSpot(spot: SpotWithLayout) {
    navigateTo(getSpotPath(spot.id))
  }

  let page = null

  switch (route.page) {
    case 'landing':
      page = <LandingPage onNavigate={navigateTo} onOpenGuide={openGuide} />
      break
    case 'overview':
      page = (
        <OverviewPage
          visitedSpotIds={visitedSpotIds}
          onNavigate={navigateTo}
          onOpenGuide={openGuide}
          onOpenSpot={openSpotById}
        />
      )
      break
    case 'guide':
      page = <GuidePage onNavigate={navigateTo} />
      break
    case 'stories':
      page = (
        <StoryHubPage
          activeStoryId={storyPreviewId}
          onNavigate={navigateTo}
          onOpenSpot={openSpotById}
          onSelectStory={setStoryPreviewId}
        />
      )
      break
    case 'story': {
      const story = storyById.get(route.storyId)

      page = story ? (
        <StoryDetailPage
          story={story}
          onNavigate={navigateTo}
          onOpenSpot={openSpotById}
        />
      ) : (
        <StoryHubPage
          activeStoryId={storyPreviewId}
          onNavigate={navigateTo}
          onOpenSpot={openSpotById}
          onSelectStory={setStoryPreviewId}
        />
      )
      break
    }
    case 'academy':
      page = <AcademyHubPage onNavigate={navigateTo} />
      break
    case 'era': {
      const article = academyById.get(route.eraId)

      page = article ? (
        <AcademyEraPage
          article={article}
          onNavigate={navigateTo}
          onOpenSpot={openSpotById}
        />
      ) : (
        <AcademyHubPage onNavigate={navigateTo} />
      )
      break
    }
    case 'steles':
      page = (
        <SteleHubPage
          activeCategoryId={stelePreviewId}
          onNavigate={navigateTo}
          onOpenSpot={openSpotById}
          onSelectCategory={setStelePreviewId}
        />
      )
      break
    case 'stele': {
      const category = steleById.get(route.categoryId)

      page = category ? (
        <SteleDetailPage
          category={category}
          onNavigate={navigateTo}
          onOpenSpot={openSpotById}
        />
      ) : (
        <SteleHubPage
          activeCategoryId={stelePreviewId}
          onNavigate={navigateTo}
          onOpenSpot={openSpotById}
          onSelectCategory={setStelePreviewId}
        />
      )
      break
    }
    case 'spot':
      page = currentSpot ? (
        <DetailView
          key={currentSpot.id}
          onBack={() => navigateTo('/overview')}
          onOpenSpot={openSpot}
          spot={currentSpot}
        />
      ) : (
        <OverviewPage
          visitedSpotIds={visitedSpotIds}
          onNavigate={navigateTo}
          onOpenGuide={openGuide}
          onOpenSpot={openSpotById}
        />
      )
      break
  }

  return (
    <main className={`app-shell ea-app-shell route-${route.page}`}>
      {route.page !== 'spot' ? (
        <SiteHeader
          activeNav={getActiveNav(route)}
          route={route}
          visitedCount={visitedSpotIds.length}
          onNavigate={navigateTo}
          onOpenGuide={() => openGuide(GUIDE_LANDING_PROMPT)}
        />
      ) : null}

      {page}

      <Suspense fallback={null}>
        <GuideCompanion
          currentSpot={currentSpot}
          currentView={route.page === 'spot' ? 'detail' : 'home'}
          visitedSpotIds={visitedSpotIds}
          allSpots={spotsWithLayout}
          onOpenSpot={openSpotById}
          onGoHome={() => navigateTo('/overview')}
        />
      </Suspense>
    </main>
  )
}

type HomeViewProps = {
  hoveredSpotId: string | null
  onHoverSpot: (spotId: string | null) => void
  onOpenSpot: (spot: SpotWithLayout) => void
  transitionSpotId: string | null
  visitedSpotIds: string[]
}

export function LegacyHomeView({
  hoveredSpotId,
  onHoverSpot,
  onOpenSpot,
  transitionSpotId,
  visitedSpotIds,
}: HomeViewProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [displayFrame, setDisplayFrame] = useState<DisplayFrame>(() =>
    createDisplayFrame(1600, 980),
  )
  const [isOverviewReady, setIsOverviewReady] = useState(false)
  const [previewSpotId, setPreviewSpotId] = useState<string>(
    spotsWithLayout[0]?.id ?? '',
  )
  const [isChapterDockOpen, setIsChapterDockOpen] = useState(false)
  const [isChapterDockVisible, setIsChapterDockVisible] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string>('intro-section')

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

    const resizeObserver = new ResizeObserver(() => {
      updateFrame()
    })

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
    let frame = 0

    image.src = OVERVIEW_IMAGE_SRC

    if (image.complete) {
      frame = window.requestAnimationFrame(() => {
        if (!cancelled) {
          setIsOverviewReady(true)
        }
      })
    } else {
      image
        .decode()
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) {
            setIsOverviewReady(true)
          }
        })
    }

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [])

  const hoveredSpot =
    spotsWithLayout.find((spot) => spot.id === hoveredSpotId) ?? null
  const transitionSpot =
    spotsWithLayout.find((spot) => spot.id === transitionSpotId) ?? null
  const previewSpot =
    spotsWithLayout.find((spot) => spot.id === previewSpotId) ?? spotsWithLayout[0]
  const hotspotHitPadding = Math.max(
    HOTSPOT_HIT_PADDING_MIN,
    Math.min(displayFrame.width * 0.012, HOTSPOT_HIT_PADDING_MAX),
  )
  const isTransitioning = transitionSpot !== null

  useEffect(() => {
    if (!hoveredSpotId) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      setPreviewSpotId(hoveredSpotId)
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [hoveredSpotId])

  useEffect(() => {
    let frame = 0

    const updateChapterDock = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        setIsChapterDockVisible(window.scrollY > Math.max(window.innerHeight * 0.42, 260))

        let nextActiveSectionId: (typeof HOME_SECTION_LINKS)[number]['id'] =
          HOME_SECTION_LINKS[0].id
        let nearestDistance = Number.POSITIVE_INFINITY

        for (const section of HOME_SECTION_LINKS) {
          const node = document.getElementById(section.id)

          if (!node) {
            continue
          }

          const rect = node.getBoundingClientRect()
          const distance = Math.abs(rect.top - 132)

          if (rect.top <= window.innerHeight * 0.48 && distance < nearestDistance) {
            nearestDistance = distance
            nextActiveSectionId = section.id
          }
        }

        setActiveSectionId(nextActiveSectionId)
      })
    }

    updateChapterDock()
    window.addEventListener('scroll', updateChapterDock, { passive: true })
    window.addEventListener('resize', updateChapterDock)

    return () => {
      window.removeEventListener('scroll', updateChapterDock)
      window.removeEventListener('resize', updateChapterDock)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  function getHotspotGeometry(spot: SpotWithLayout): HotspotGeometry {
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

    return {
      left: left - hotspotHitPadding,
      top: top - hotspotHitPadding,
      width,
      height,
      points,
      centerX: left + boxWidth / 2,
      centerY: top + boxHeight / 2,
      boxWidth,
      boxHeight,
    }
  }

  function getPreviewStyle(spot: SpotWithLayout) {
    const geometry = getHotspotGeometry(spot)
    const previewWidth = Math.min(360, displayFrame.stageWidth - 48)
    const previewHeight = 420
    const preferLeft = geometry.centerX + displayFrame.left > displayFrame.stageWidth * 0.56
    const rawLeft = preferLeft
      ? displayFrame.left + geometry.centerX - previewWidth - 38
      : displayFrame.left + geometry.centerX + 38
    const rawTop = displayFrame.top + geometry.centerY - previewHeight * 0.44

    return {
      left: Math.min(
        Math.max(rawLeft, 24),
        displayFrame.stageWidth - previewWidth - 24,
      ),
      top: Math.min(
        Math.max(rawTop, 24),
        displayFrame.stageHeight - previewHeight - 24,
      ),
      width: previewWidth,
      '--accent': spot.accent,
    } as CSSProperties
  }

  function getViewportStyle() {
    const style: CSSProperties = {
      left: displayFrame.left,
      top: displayFrame.top,
      width: displayFrame.width,
      height: displayFrame.height,
    }

    if (!transitionSpot) {
      return style
    }

    const geometry = getHotspotGeometry(transitionSpot)
    const areaRatio =
      (geometry.boxWidth * geometry.boxHeight) /
      (displayFrame.stageWidth * displayFrame.stageHeight)
    const scale = Math.min(Math.max(2.24 - areaRatio * 3.4, 1.34), 2.36)
    const targetX = displayFrame.stageWidth * 0.5
    const targetY = displayFrame.stageHeight * 0.46
    const translateX =
      targetX - displayFrame.left - geometry.centerX * scale
    const translateY =
      targetY - displayFrame.top - geometry.centerY * scale

    style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`
    style.transformOrigin = '0 0'

    return style
  }

  function handleHotspotKeyDown(
    event: ReactKeyboardEvent<SVGSVGElement>,
    spot: SpotWithLayout,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    onOpenSpot(spot)
  }

  function scrollToSection(sectionId: string) {
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function handleChapterJump(sectionId: string) {
    scrollToSection(sectionId)
    setIsChapterDockOpen(false)
  }

  function handleGuideOpen(prompt?: string) {
    openGuideCompanion({
      mode: 'welcome',
      prompt:
        prompt ??
        '请像真正带队入园的导游一样欢迎我，并告诉我先从总览图里看什么，再推荐第一站。',
    })
  }

  function handleOpenSpotById(spotId: string) {
    const spot = spotsWithLayout.find((candidate) => candidate.id === spotId)

    if (!spot) {
      return
    }

    onOpenSpot(spot)
  }

  return (
    <div className="home-shell">
      <section className="home-hero fade-rise" id="top">
        <div
          className="home-hero__poster"
          style={{ backgroundImage: 'url(/ppt/home/hero-poster.png)' }}
          aria-hidden="true"
        />
        <video
          className="home-hero__video"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/ppt/home/hero-poster.png"
        >
          <source src="/ppt/home/hero-main.mp4" type="video/mp4" />
        </video>
        <div className="home-hero__veil" />

        <header className="home-header">
          <button
            type="button"
            className="home-header__brand"
            onClick={() => scrollToSection('top')}
          >
            <span>EchoArch</span>
            <strong>百泉湖古建筑群</strong>
          </button>

          <nav className="home-header__nav" aria-label="首页分区导航">
            {HOME_SECTION_LINKS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => handleChapterJump(section.id)}
              >
                {section.label}
              </button>
            ))}
            <button type="button" onClick={() => handleGuideOpen()}>
              智能导览
            </button>
          </nav>

          <div className="home-header__auth" aria-label="预留登录注册入口">
            <span>登录</span>
            <i>/</i>
            <span>注册</span>
          </div>
        </header>

        <div className="home-hero__body">
          <div className="home-hero__eyebrow">
            <span>首页</span>
            <span>钟灵百泉</span>
          </div>

          <h1>百泉湖古建筑群</h1>
          <p>
            以湖山为卷，以古建为骨，以碑刻与故事为声。这里不是普通网页，而是一场可以缓缓步入的古园游历。
          </p>

          <div className="home-hero__actions">
            <button type="button" onClick={() => scrollToSection('map-section')}>
              进入总览长卷
            </button>
            <button type="button" onClick={() => handleGuideOpen()}>
              唤醒智能导览
            </button>
          </div>

          <div className="home-hero__metrics">
            {homeHeroChapters.map((chapter, index) => (
              <div key={chapter}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{chapter}</strong>
              </div>
            ))}
            <div>
              <span>{String(spotsWithLayout.length).padStart(2, '0')}</span>
              <strong>古建筑点位</strong>
            </div>
          </div>
        </div>

        <div className="home-hero__trail">
          <span>{visitedSpotIds.length} 处已驻足</span>
          <span>湖山书院行宫并置</span>
          <span>从总览图继续入景</span>
        </div>
      </section>

      <aside
        className={[
          'chapter-dock',
          isChapterDockVisible ? 'is-visible' : '',
          isChapterDockOpen ? 'is-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label="悬浮章节导航"
      >
        <button
          type="button"
          className="chapter-dock__toggle"
          onClick={() => setIsChapterDockOpen((current) => !current)}
        >
          <span>章节</span>
          <strong>{HOME_SECTION_LINKS.find((item) => item.id === activeSectionId)?.label ?? '目录'}</strong>
        </button>

        <div className="chapter-dock__panel">
          <div className="chapter-dock__links">
            {HOME_SECTION_LINKS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSectionId === section.id ? 'is-active' : undefined}
                onClick={() => handleChapterJump(section.id)}
              >
                {section.label}
              </button>
            ))}
            <button type="button" onClick={() => handleGuideOpen()}>
              智能导览
            </button>
          </div>

          <div className="chapter-dock__actions">
            <button type="button" onClick={() => handleChapterJump('top')}>
              回到首页
            </button>
            <button type="button" onClick={() => handleChapterJump('map-section')}>
              看总览图
            </button>
          </div>
        </div>
      </aside>

      <section className="section-shell home-intro fade-rise" id="intro-section">
        <div className="home-section-heading">
          <div>
            <span>钟灵百泉</span>
            <h2>一园之内，藏湖山、书院、行宫与千年碑刻。</h2>
          </div>
          <p>
            先看整体气韵，再入具体建筑。PPT 中的首页图文信息会在这里汇成真正可浏览、可交互的开篇。
          </p>
        </div>

        <div className="home-intro__layout">
          <div className="home-intro__gallery" aria-label="百泉湖首页图集">
            <figure className="home-intro__image home-intro__image--tall">
              <img src="/ppt/home/intro-1.jpg" alt="百泉湖首页图之一" loading="eager" />
            </figure>
            <figure className="home-intro__image home-intro__image--wide">
              <img src="/ppt/home/intro-2.jpg" alt="百泉湖首页图之二" loading="lazy" />
            </figure>
            <figure className="home-intro__image home-intro__image--card">
              <img src="/ppt/home/intro-3.jpg" alt="百泉湖首页图之三" loading="lazy" />
            </figure>
          </div>

          <div className="home-intro__copy">
            {homeIntroParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 20)}>{paragraph}</p>
            ))}

            <div className="home-intro__stats">
              {homeIntroStats.map((stat) => (
                <article key={stat.label}>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                  <p>{stat.note}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell home-guide-banner fade-rise" id="guide-section">
        <div className="home-guide-banner__copy">
          <span>智能导览</span>
          <h2>不只回答问题，也能真正带你在园中走动。</h2>
          <p>
            导览入口保留为浮动灯笼，但首页里也给它一个正式席位。后续接入 API 后，它可以继续承担讲解、带路、切换线路等角色。
          </p>
        </div>

        <div className="home-guide-banner__actions">
          <button type="button" onClick={() => handleGuideOpen()}>
            请导游带我入园
          </button>
          <button
            type="button"
            onClick={() =>
              handleGuideOpen('请先根据总览图，为我规划一条从湖心到书院的游览路线。')
            }
          >
            规划一条路线
          </button>
          <button
            type="button"
            onClick={() =>
              handleGuideOpen('我想先听百泉书院和乾隆行宫的关系，请用导游口吻讲给我听。')
            }
          >
            先听一段故事
          </button>
        </div>
      </section>

      <section className="home-map-chapter fade-rise" id="map-section">
        <div className="section-shell home-section-heading home-section-heading--map">
          <div>
            <span>总览入景</span>
            <h2>沿着总览长卷悬停、停驻、再点击进入具体建筑。</h2>
          </div>
          <p>
            首页视频负责定氛围，总览图负责真正把人带进园子里。点位仍然保留你现在这套可用的交互逻辑。
          </p>
        </div>

        <section className="overview-card">
        <div
          ref={stageRef}
          className={[
            'overview-stage',
            isOverviewReady ? 'is-ready' : '',
            isTransitioning ? 'is-transitioning' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="overview-stage__boot" aria-hidden="true">
            <span>百泉古建筑群</span>
            <strong>由总览入景</strong>
          </div>

          <div className="overview-stage__viewport" style={getViewportStyle()}>
            <img
              className="overview-stage__image"
              src={OVERVIEW_IMAGE_SRC}
              alt="百泉古建筑群总览图"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onLoad={() => setIsOverviewReady(true)}
            />

            <div className="overview-stage__hotspots-layer">
              {spotsWithLayout.map((spot) => {
                const geometry = getHotspotGeometry(spot)
                const isHovered = hoveredSpotId === spot.id
                const isVisited = visitedSpotIds.includes(spot.id)

                return (
                  <div
                    key={spot.id}
                    className={[
                      'overview-hotspot',
                      isHovered ? 'is-hovered' : '',
                      isVisited ? 'is-visited' : '',
                      transitionSpotId === spot.id ? 'is-selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={
                      {
                        left: geometry.left,
                        top: geometry.top,
                        width: geometry.width,
                        height: geometry.height,
                        '--accent': spot.accent,
                        '--frame-inset': `${hotspotHitPadding}px`,
                      } as CSSProperties
                    }
                  >
                    <svg
                      className="overview-hotspot__shape"
                      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
                      role="button"
                      tabIndex={isTransitioning ? -1 : 0}
                      aria-label={`进入 ${spot.name}`}
                      onPointerEnter={() => onHoverSpot(spot.id)}
                      onPointerLeave={() => onHoverSpot(null)}
                      onFocus={() => onHoverSpot(spot.id)}
                      onBlur={() => onHoverSpot(null)}
                      onClick={() => onOpenSpot(spot)}
                      onKeyDown={(event) => handleHotspotKeyDown(event, spot)}
                    >
                      <polygon
                        className="overview-hotspot__glow"
                        points={geometry.points}
                      />
                      <polygon
                        className="overview-hotspot__wash"
                        points={geometry.points}
                      />
                      <polygon
                        className="overview-hotspot__frame"
                        points={geometry.points}
                      />
                    </svg>

                    <span className="overview-hotspot__badge">{spot.order}</span>
                    <span className="overview-hotspot__name">{spot.name}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="overview-stage__transition-veil" />
          <div className="overview-stage__wash" />
          <div className="overview-stage__mist overview-stage__mist--left" />
          <div className="overview-stage__mist overview-stage__mist--right" />

          <div className="overview-stage__inscription">
            <span>百泉古建总览</span>
            <h2>亭桥散落于水面与山麓之间</h2>
            <p>移入其间，便仿佛从长卷步入一处真实的建筑。</p>
          </div>

          <div className="overview-stage__trail">
            <span>{spotsWithLayout.length} 处古建筑</span>
            <span>{visitedSpotIds.length} 处已驻足</span>
            <span>循印入景</span>
          </div>

          {previewSpot ? (
            <article
              className={[
                'overview-preview',
                hoveredSpot && !isTransitioning ? 'is-visible' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={getPreviewStyle(previewSpot)}
            >
              <img
                src={previewSpot.images[0]?.src}
                alt={previewSpot.images[0]?.alt ?? previewSpot.name}
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />

              <div className="overview-preview__copy">
                <span>
                  {String(previewSpot.order).padStart(2, '0')} 路 {previewSpot.region}
                </span>
                <h2>{previewSpot.name}</h2>
                <p>{previewSpot.description}</p>
              </div>
            </article>
          ) : null}
        </div>
        </section>
      </section>

      <section
        className={[
          'journey-strip',
          'fade-rise',
          isTransitioning ? 'is-muted' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        id="journey-section"
      >
        <div className="journey-strip__heading">
          <div>
            <span>缓行次第</span>
            <h2>若不想立刻点图，也可以顺着园路一站站慢慢走。</h2>
          </div>
          <p>把原先密集的卡片改成更像游线的横向廊道，既保留引导，也不会把页面切得太碎。</p>
        </div>

        <div className="journey-strip__rail">
          {spotsWithLayout.map((spot) => (
            <button
              key={spot.id}
              type="button"
              className="journey-card"
              onClick={() => onOpenSpot(spot)}
            >
              <img
                src={spot.images[0]?.src}
                alt={spot.images[0]?.alt ?? spot.name}
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />

              <div className="journey-card__body">
                <span className="journey-card__order">
                  {String(spot.order).padStart(2, '0')}
                </span>
                <strong>{spot.name}</strong>
                <em>{spot.highlight}</em>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="section-shell home-storyworld fade-rise" id="stories-section">
        <div className="home-section-heading">
          <div>
            <span>鸾翔凤集</span>
            <h2>先贤行迹与百泉湖互相照亮，人物故事成为游览的另一层入口。</h2>
          </div>
          <p>
            这里不直接替代景点页，而是作为从人物进入场所的章节入口。点击后仍然能回到对应建筑或相关空间。
          </p>
        </div>

        <div className="home-storyworld__layout">
          <article className="home-storyworld__lead">
            <img
              src="/ppt/luanxiang/sushi.png"
              alt="鸾翔凤集章节主视觉"
              loading="lazy"
            />
            <div className="home-storyworld__lead-copy">
              <span>人物故事入口</span>
              <h3>让游客不是在“看卡片”，而是在一段段旧事里找到进入园林的方式。</h3>
              <p>
                从岳飞到苏轼，从竹林七贤到乾隆南巡，百泉的空间从来不是单纯的建筑集合，而是不断被人物、题刻与记忆重新点亮的现场。
              </p>
            </div>
          </article>

          <div className="home-storyworld__grid">
            {homeStoryEntries.map((story) => (
              <article key={story.id} className="story-card">
                <img src={story.imageSrc} alt={story.imageAlt} loading="lazy" />

                <div className="story-card__copy">
                  <span>{story.subtitle}</span>
                  <h3>{story.title}</h3>
                  <p>{story.description}</p>
                  <button type="button" onClick={() => handleOpenSpotById(story.spotId)}>
                    前往相关景处
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell home-wenmai fade-rise" id="timeline-section">
        <div className="home-section-heading">
          <div>
            <span>文脉流长</span>
            <h2>把书院历史变迁与碑刻欣赏，做成真正可以沉下去看的第二层内容。</h2>
          </div>
          <p>{homeTimelineLead}</p>
        </div>

        <div className="home-timeline">
          {homeTimelineEntries.map((entry) => (
            <article key={entry.era} className="timeline-card">
              <div className="timeline-card__era">{entry.era}</div>
              <img src={entry.imageSrc} alt={entry.imageAlt} loading="lazy" />
              <div className="timeline-card__copy">
                <h3>{entry.title}</h3>
                <p>{entry.description}</p>
                <button type="button" onClick={() => handleOpenSpotById(entry.spotId)}>
                  看对应空间
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="home-stele">
          <div className="home-stele__heading">
            <span>百泉碑刻欣赏</span>
            <h3>从汉到清，碑廊像一部可以步入其间的书法长卷。</h3>
          </div>

          <div className="home-stele__grid" id="steles-section">
            {homeSteleEntries.map((entry) => (
              <article key={entry.era} className="stele-card">
                <img src={entry.imageSrc} alt={entry.imageAlt} loading="lazy" />
                <div className="stele-card__copy">
                  <span>{entry.era}</span>
                  <h3>{entry.title}</h3>
                  <p>{entry.description}</p>
                  <button type="button" onClick={() => handleOpenSpotById(entry.spotId)}>
                    走入碑廊
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell home-return fade-rise" id="home-return">
        <div className="home-return__copy">
          <span>游园回望</span>
          <h2>看完这卷，可以回到首页首屏，再从另一条线重新入园。</h2>
          <p>把顶部的章节入口延续到底部，同时留一个明显的“回首页”动作，滚到底也不会断掉体验。</p>
        </div>

        <div className="home-return__actions">
          <button type="button" onClick={() => handleChapterJump('top')}>
            回到首页首屏
          </button>
          <button type="button" onClick={() => handleChapterJump('map-section')}>
            回到总览图
          </button>
          <button type="button" onClick={() => handleGuideOpen()}>
            继续智能导览
          </button>
        </div>
      </section>
    </div>
  )
}

type DetailViewProps = {
  onBack: () => void
  onOpenSpot: (spot: SpotWithLayout) => void
  spot: SpotWithLayout
}

function DetailView({ onBack, onOpenSpot, spot }: DetailViewProps) {
  const [activeGallery, setActiveGallery] = useState({
    spotId: spot.id,
    index: 0,
  })
  const activeImageIndex =
    activeGallery.spotId === spot.id ? activeGallery.index : 0
  const featureImage = spot.images[activeImageIndex] ?? spot.images[0]
  const paragraphs = splitIntoParagraphs(spot.fullText)
  const storyLead = paragraphs[0] ?? spot.excerpt
  const storyParagraphs =
    paragraphs.length > 1 ? paragraphs.slice(1) : [spot.description]
  const relatedSpots = spotsWithLayout.filter((candidate) =>
    spot.related.includes(candidate.id),
  )
  const spotIndex = spotsWithLayout.findIndex((candidate) => candidate.id === spot.id)
  const previousSpot = spotsWithLayout.at(
    (spotIndex - 1 + spotsWithLayout.length) % spotsWithLayout.length,
  )
  const nextSpot = spotsWithLayout.at((spotIndex + 1) % spotsWithLayout.length)
  const nextRecommendedSpot = relatedSpots[0] ?? nextSpot ?? null

  return (
    <div className="spot-article ea-route ea-chapter fade-rise">
      <section className="ea-chapter-hero spot-article__hero">
        <div className="ea-chapter-hero__media">
          <img
            src={featureImage?.src}
            alt={featureImage?.alt ?? spot.name}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className="ea-chapter-hero__veil spot-article__veil" />

        <div className="ea-page-shell ea-chapter-hero__inner">
          <header className="spot-article__topbar">
            <button type="button" className="spot-article__back" onClick={onBack}>
              返回地图总览
            </button>

            <div className="spot-article__meta">
              <span>{spot.region}</span>
              <strong>
                {String(spot.order).padStart(2, '0')} / {spotsWithLayout.length}
              </strong>
            </div>
          </header>

          <div className="ea-chapter-hero__body">
            <div className="ea-chapter-hero__copy">
              <span className="ea-kicker">{spot.region}</span>
              <h1>{spot.name}</h1>
              <p>{spot.description}</p>

              <div className="ea-actions">
                {nextRecommendedSpot ? (
                  <button type="button" onClick={() => onOpenSpot(nextRecommendedSpot)}>
                    继续前往{nextRecommendedSpot.name}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="is-secondary"
                  onClick={() =>
                    openGuideCompanion({
                      mode: 'route',
                      prompt: `请以百泉湖古建筑群导游的口吻讲解${spot.name}，并根据当前所在位置推荐我下一步最适合前往的景点。`,
                    })
                  }
                >
                  让引路人讲这一处
                </button>
              </div>
            </div>

            <aside className="ea-chapter-hero__note">
              <span>入景题记</span>
              <strong>{spot.highlight}</strong>
              <p>{spot.excerpt}</p>
            </aside>
          </div>

          <div className="ea-chapter-hero__footer">
            <div className="ea-chapter-hero__stat">
              <span>时代表貌</span>
              <strong>{spot.era}</strong>
            </div>
            <div className="ea-chapter-hero__stat">
              <span>景中气韵</span>
              <strong>{spot.mood}</strong>
            </div>
            <div className="ea-chapter-hero__stat">
              <span>图像档案</span>
              <strong>{spot.images.length} 幅图像</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="ea-page-shell ea-chapter-frame spot-article__frame">
        <aside className="ea-chapter-frame__aside spot-article__aside">
          <article className="ea-chapter-note">
            <span>建筑印象</span>
            <strong>{spot.highlight}</strong>
            <p>
              这一处不只是单体建筑，它和周边湖山、碑刻与书院空间共同构成了百泉游览中的一个停驻节点。
            </p>
          </article>

          <section className="spot-article__waypoints">
            <div className="spot-article__waypoints-head">
              <span>园中诸景</span>
              <strong>循序而行</strong>
            </div>

            <div className="spot-article__waypoints-rail">
              {spotsWithLayout.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className={candidate.id === spot.id ? 'is-active' : undefined}
                  onClick={() => onOpenSpot(candidate)}
                >
                  <i>{String(candidate.order).padStart(2, '0')}</i>
                  <strong>{candidate.name}</strong>
                  <small>{candidate.region}</small>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <div className="ea-chapter-frame__main">
          <article className="ea-scroll-essay spot-article__essay">
            <header className="ea-scroll-essay__header">
              <span className="ea-article__eyebrow">{spot.highlight}</span>
              <h2>{spot.name}与百泉湖</h2>
              <p className="ea-scroll-essay__lead">{storyLead}</p>
            </header>

            <div className="ea-scroll-essay__body">
              {storyParagraphs.map((paragraph, index) => (
                <section
                  key={paragraph.slice(0, 30)}
                  className="ea-scroll-essay__section"
                >
                  <i>{String(index + 1).padStart(2, '0')}</i>
                  <p>{paragraph}</p>
                </section>
              ))}
            </div>
          </article>

          <section className="spot-gallery">
            <div className="spot-gallery__stage">
              <div className="spot-gallery__visual">
                <img
                  src={featureImage?.src}
                  alt={featureImage?.alt ?? spot.name}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
                <div className="spot-gallery__veil" />
              </div>

              <div className="spot-gallery__copy">
                <span>图像长卷</span>
                <h3>{featureImage?.caption ?? `${spot.name}影像`}</h3>
                <p>
                  眼前这一幅，是进入 {spot.name} 的第一重视角。继续翻阅，建筑的正面、侧影与细部会慢慢显现出来。
                </p>
                <p>
                  从图像进入这处空间，能更直接感受到它在园林格局中的位置、尺度与气韵。
                </p>

                <div className="spot-gallery__facts">
                  <span>{spot.region}</span>
                  <span>{spot.era}</span>
                  <span>{spot.images.length} 幅图像</span>
                </div>
              </div>
            </div>

            {spot.images.length > 1 ? (
              <div className="spot-gallery__rail">
                {spot.images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    className={index === activeImageIndex ? 'is-active' : undefined}
                    onClick={() =>
                      setActiveGallery({
                        spotId: spot.id,
                        index,
                      })
                    }
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      loading="lazy"
                      decoding="async"
                      fetchPriority="low"
                    />
                    <span>{image.caption}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          {relatedSpots.length ? (
            <section className="spot-related-stage">
              <div className="spot-related-stage__heading">
                <div>
                  <span>续行景脉</span>
                  <h3>与此处相连的景中去向</h3>
                </div>
                <p>不必退回总览重新寻找，顺着这处建筑继续前行，百泉的空间关系会更完整。</p>
              </div>

              <div className="spot-related-stage__grid">
                {relatedSpots.map((relatedSpot) => (
                  <button
                    key={relatedSpot.id}
                    type="button"
                    className="spot-related-stage__card"
                    onClick={() => onOpenSpot(relatedSpot)}
                  >
                    <div className="spot-related-stage__image">
                      <img
                        src={relatedSpot.images[0]?.src}
                        alt={relatedSpot.images[0]?.alt ?? relatedSpot.name}
                        loading="lazy"
                      />
                    </div>
                    <div className="spot-related-stage__veil" />
                    <div className="spot-related-stage__copy">
                      <small>
                        {String(relatedSpot.order).padStart(2, '0')} / {relatedSpot.region}
                      </small>
                      <strong>{relatedSpot.name}</strong>
                      <span>{relatedSpot.highlight}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>

      <section className="ea-page-shell ea-journey-grid spot-article__journey">
        {previousSpot ? (
          <button type="button" className="ea-journey-card" onClick={() => onOpenSpot(previousSpot)}>
            <div className="ea-journey-card__image">
              <img
                src={previousSpot.images[0]?.src}
                alt={previousSpot.images[0]?.alt ?? previousSpot.name}
                loading="lazy"
              />
            </div>
            <div className="ea-journey-card__veil" />
            <div className="ea-journey-card__copy">
              <span>前一处</span>
              <strong>{previousSpot.name}</strong>
              <p>{previousSpot.highlight}</p>
            </div>
          </button>
        ) : (
          <span />
        )}

        <button type="button" className="ea-journey-return" onClick={onBack}>
          回到地图总览
        </button>

        {nextSpot ? (
          <button type="button" className="ea-journey-card" onClick={() => onOpenSpot(nextSpot)}>
            <div className="ea-journey-card__image">
              <img
                src={nextSpot.images[0]?.src}
                alt={nextSpot.images[0]?.alt ?? nextSpot.name}
                loading="lazy"
              />
            </div>
            <div className="ea-journey-card__veil" />
            <div className="ea-journey-card__copy">
              <span>后一处</span>
              <strong>{nextSpot.name}</strong>
              <p>{nextSpot.highlight}</p>
            </div>
          </button>
        ) : (
          <span />
        )}
      </section>
    </div>
  )
}

export default App
