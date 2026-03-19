import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { heritageSpots } from './data/heritage-data'
import {
  OVERVIEW_IMAGE_SIZE,
  overviewLayoutBySpotId,
  type HotspotLayout,
} from './overview-layout'
import type { HeritageSpot } from './types'

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

const HOTSPOT_HIT_PADDING_MIN = 14
const HOTSPOT_HIT_PADDING_MAX = 26

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

function splitIntoParagraphs(text: string) {
  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length > 1) {
    return paragraphs
  }

  const sentences = text
    .split(/(?<=[。！？])/u)
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
  const [currentSpotId, setCurrentSpotId] = useState<string | null>(() =>
    readValidSpotIdFromHash(),
  )
  const [hoveredSpotId, setHoveredSpotId] = useState<string | null>(null)
  const [visitedSpotIds, setVisitedSpotIds] = useState<string[]>(() => {
    const initialSpotId = readValidSpotIdFromHash()
    return initialSpotId ? [initialSpotId] : []
  })

  useEffect(() => {
    function syncRouteFromHash() {
      const hashSpotId = readValidSpotIdFromHash()
      setCurrentSpotId(hashSpotId)

      if (hashSpotId) {
        setVisitedSpotIds((current) =>
          current.includes(hashSpotId) ? current : [...current, hashSpotId],
        )
      }
    }

    window.addEventListener('hashchange', syncRouteFromHash)

    return () => {
      window.removeEventListener('hashchange', syncRouteFromHash)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentSpotId])

  const currentSpot =
    spotsWithLayout.find((spot) => spot.id === currentSpotId) ?? null

  function openSpot(spot: SpotWithLayout) {
    startTransition(() => {
      setCurrentSpotId(spot.id)
      setHoveredSpotId(null)
    })

    setVisitedSpotIds((current) =>
      current.includes(spot.id) ? current : [...current, spot.id],
    )

    const nextHash = `#/spot/${encodeURIComponent(spot.id)}`

    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash
    }
  }

  function goHome() {
    startTransition(() => {
      setCurrentSpotId(null)
      setHoveredSpotId(null)
    })

    if (window.location.hash !== '#/' && window.location.hash !== '') {
      window.location.hash = '/'
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <main className="app-shell">
      {currentSpot ? (
        <DetailView key={currentSpot.id} onBack={goHome} onOpenSpot={openSpot} spot={currentSpot} />
      ) : (
        <HomeView
          hoveredSpotId={hoveredSpotId}
          onHoverSpot={setHoveredSpotId}
          onOpenSpot={openSpot}
          visitedSpotIds={visitedSpotIds}
        />
      )}
    </main>
  )
}

type HomeViewProps = {
  hoveredSpotId: string | null
  onHoverSpot: (spotId: string | null) => void
  onOpenSpot: (spot: SpotWithLayout) => void
  visitedSpotIds: string[]
}

function HomeView({
  hoveredSpotId,
  onHoverSpot,
  onOpenSpot,
  visitedSpotIds,
}: HomeViewProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [displayFrame, setDisplayFrame] = useState<DisplayFrame>(() =>
    createDisplayFrame(1600, 980),
  )
  const [previewSpotId, setPreviewSpotId] = useState<string>(
    spotsWithLayout[0]?.id ?? '',
  )

  useEffect(() => {
    const node = stageRef.current

    if (!node) {
      return
    }

    const updateFrame = () => {
      const rect = node.getBoundingClientRect()
      setDisplayFrame(createDisplayFrame(rect.width, rect.height))
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
    }
  }, [])

  const hoveredSpot =
    spotsWithLayout.find((spot) => spot.id === hoveredSpotId) ?? null
  const previewSpot =
    spotsWithLayout.find((spot) => spot.id === previewSpotId) ?? spotsWithLayout[0]
  const hotspotHitPadding = Math.max(
    HOTSPOT_HIT_PADDING_MIN,
    Math.min(displayFrame.width * 0.012, HOTSPOT_HIT_PADDING_MAX),
  )

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

  function getHotspotStyle(spot: SpotWithLayout) {
    const left =
      displayFrame.left +
      (spot.layout.x / OVERVIEW_IMAGE_SIZE.width) * displayFrame.width
    const top =
      displayFrame.top +
      (spot.layout.y / OVERVIEW_IMAGE_SIZE.height) * displayFrame.height
    const width =
      (spot.layout.width / OVERVIEW_IMAGE_SIZE.width) * displayFrame.width
    const height =
      (spot.layout.height / OVERVIEW_IMAGE_SIZE.height) * displayFrame.height

    return {
      left: left - hotspotHitPadding,
      top: top - hotspotHitPadding,
      width: width + hotspotHitPadding * 2,
      height: height + hotspotHitPadding * 2,
      '--accent': spot.accent,
      '--frame-inset': `${hotspotHitPadding}px`,
    } as CSSProperties
  }

  function getPreviewStyle(spot: SpotWithLayout) {
    const hotspotCenterX =
      displayFrame.left +
      ((spot.layout.x + spot.layout.width / 2) / OVERVIEW_IMAGE_SIZE.width) *
        displayFrame.width
    const hotspotCenterY =
      displayFrame.top +
      ((spot.layout.y + spot.layout.height / 2) / OVERVIEW_IMAGE_SIZE.height) *
        displayFrame.height
    const previewWidth = Math.min(360, displayFrame.stageWidth - 48)
    const previewHeight = 420
    const preferLeft = hotspotCenterX > displayFrame.stageWidth * 0.56
    const rawLeft = preferLeft
      ? hotspotCenterX - previewWidth - 38
      : hotspotCenterX + 38
    const rawTop = hotspotCenterY - previewHeight * 0.44

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

  return (
    <div className="home-shell">
      <section className="overview-card fade-rise">
        <div ref={stageRef} className="overview-stage">
          <div
            className="overview-stage__artboard"
            style={{
              left: displayFrame.left,
              top: displayFrame.top,
              width: displayFrame.width,
              height: displayFrame.height,
            }}
          >
            <img
              className="overview-stage__image"
              src="/landing/overview.jpg"
              alt="百泉古建筑群总览图"
            />
          </div>
          <div className="overview-stage__wash" />
          <div className="overview-stage__mist overview-stage__mist--left" />
          <div className="overview-stage__mist overview-stage__mist--right" />
          <div className="overview-stage__inscription">
            <span>百泉古建总览</span>
            <h2>亭榭散落于水面与山麓之间</h2>
            <p>移入其间，便从长卷走进一处真实的建筑。</p>
          </div>
          <div className="overview-stage__trail">
            <span>{spotsWithLayout.length} 处古建筑</span>
            <span>{visitedSpotIds.length} 处已驻足</span>
            <span>循印入景</span>
          </div>

          {spotsWithLayout.map((spot) => {
            const isHovered = hoveredSpotId === spot.id
            const isVisited = visitedSpotIds.includes(spot.id)

            return (
              <button
                key={spot.id}
                type="button"
                className={[
                  'overview-hotspot',
                  isHovered ? 'is-hovered' : '',
                  isVisited ? 'is-visited' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={getHotspotStyle(spot)}
                onPointerEnter={() => onHoverSpot(spot.id)}
                onPointerLeave={() => onHoverSpot(null)}
                onFocus={() => onHoverSpot(spot.id)}
                onBlur={() => onHoverSpot(null)}
                onClick={() => onOpenSpot(spot)}
              >
                <span className="overview-hotspot__wash" aria-hidden="true" />
                <span className="overview-hotspot__frame" aria-hidden="true" />
                <span className="overview-hotspot__glow" aria-hidden="true" />
                <span className="overview-hotspot__badge">{spot.order}</span>
                <span className="overview-hotspot__name">{spot.name}</span>
              </button>
            )
          })}

          {previewSpot ? (
            <article
              className={[
                'overview-preview',
                hoveredSpot ? 'is-visible' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={getPreviewStyle(previewSpot)}
            >
              <img
                src={previewSpot.images[0]?.src}
                alt={previewSpot.images[0]?.alt ?? previewSpot.name}
              />
              <div className="overview-preview__copy">
                <span>
                  {String(previewSpot.order).padStart(2, '0')} · {previewSpot.region}
                </span>
                <h2>{previewSpot.name}</h2>
                <p>{previewSpot.description}</p>
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="journey-strip fade-rise">
        <div className="journey-strip__heading">
          <div>
            <span>行旅次第</span>
            <h2>若不循图而入，也可以沿着次序缓缓走下去。</h2>
          </div>
          <p>湖心、书院、山径彼此相望，视线与脚步都不必太匆忙。</p>
        </div>

        <div className="journey-strip__rail">
          {spotsWithLayout.map((spot) => (
            <button
              key={spot.id}
              type="button"
              className="journey-card"
              onClick={() => onOpenSpot(spot)}
            >
              <img src={spot.images[0]?.src} alt={spot.images[0]?.alt ?? spot.name} />
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
    </div>
  )
}

type DetailViewProps = {
  onBack: () => void
  onOpenSpot: (spot: SpotWithLayout) => void
  spot: SpotWithLayout
}

function DetailView({ onBack, onOpenSpot, spot }: DetailViewProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const featureImage = spot.images[activeImageIndex] ?? spot.images[0]
  const paragraphs = splitIntoParagraphs(spot.fullText)
  const relatedSpots = spotsWithLayout.filter((candidate) =>
    spot.related.includes(candidate.id),
  )
  const spotIndex = spotsWithLayout.findIndex((candidate) => candidate.id === spot.id)
  const previousSpot = spotsWithLayout.at(
    (spotIndex - 1 + spotsWithLayout.length) % spotsWithLayout.length,
  )
  const nextSpot = spotsWithLayout.at((spotIndex + 1) % spotsWithLayout.length)

  return (
    <div className="detail-page fade-rise">
      <header className="detail-topbar">
        <button type="button" className="detail-topbar__back" onClick={onBack}>
          返回总览
        </button>

        <div className="detail-topbar__meta">
          <span>{spot.region}</span>
          <strong>
            {String(spot.order).padStart(2, '0')} / {spotsWithLayout.length}
          </strong>
        </div>
      </header>

      <section className="detail-hero">
        <img
          className="detail-hero__image"
          src={featureImage?.src}
          alt={featureImage?.alt ?? spot.name}
        />
        <div className="detail-hero__veil" />

        <div className="detail-hero__content">
          <span className="detail-hero__kicker">{spot.region}</span>
          <h1>{spot.name}</h1>
          <p>{spot.description}</p>

          <div className="detail-hero__stats">
            <div>
              <span>所在区域</span>
              <strong>{spot.region}</strong>
            </div>
            <div>
              <span>时代风貌</span>
              <strong>{spot.era}</strong>
            </div>
            <div>
              <span>景中气韵</span>
              <strong>{spot.mood}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="detail-content">
        <section className="detail-block detail-block--summary">
          <div className="detail-block__heading">
            <span>卷首</span>
            <strong>{spot.highlight}</strong>
          </div>
          <p>{spot.excerpt}</p>
        </section>

        <section className="detail-block detail-block--gallery">
          <div className="detail-block__heading">
            <span>图像档案</span>
            <strong>{spot.images.length} 张素材</strong>
          </div>

          <div className="detail-gallery__feature">
            <img src={featureImage?.src} alt={featureImage?.alt ?? spot.name} />
            <div>
              <h2>{featureImage?.caption ?? '主图'}</h2>
              <p>
                眼前这一幅，是进入 {spot.name} 的第一重视角。继续翻阅，建筑的正面、
                侧影与细部会慢慢显现出来。
              </p>
            </div>
          </div>

          <div className="detail-gallery__thumbs">
            {spot.images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                className={index === activeImageIndex ? 'is-active' : undefined}
                onClick={() => setActiveImageIndex(index)}
              >
                <img src={image.src} alt={image.alt} />
                <span>{image.caption}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="detail-block detail-block--story">
          <div className="detail-block__heading">
            <span>旧事</span>
            <strong>建筑故事与历史语境</strong>
          </div>

          <div className="detail-story">
            {paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 30)}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="detail-block detail-block--related">
          <div className="detail-block__heading">
            <span>续行</span>
            <strong>与此处相连的景脉</strong>
          </div>

          <div className="detail-related">
            {relatedSpots.map((relatedSpot) => (
              <button
                key={relatedSpot.id}
                type="button"
                onClick={() => onOpenSpot(relatedSpot)}
              >
                <strong>{relatedSpot.name}</strong>
                <span>{relatedSpot.highlight}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="detail-footer-nav">
          {previousSpot ? (
            <button type="button" onClick={() => onOpenSpot(previousSpot)}>
              <span>前一处</span>
              <strong>{previousSpot.name}</strong>
            </button>
          ) : null}

          {nextSpot ? (
            <button type="button" onClick={() => onOpenSpot(nextSpot)}>
              <span>后一处</span>
              <strong>{nextSpot.name}</strong>
            </button>
          ) : null}
        </section>
      </div>
    </div>
  )
}

export default App
