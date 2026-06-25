import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Clock3,
  Compass,
  Footprints,
  Home,
  Image as ImageIcon,
  LocateFixed,
  Maximize2,
  Navigation,
  Orbit,
  RotateCcw,
  RotateCw,
  Route,
  Sparkles,
  Sunrise,
  X,
} from 'lucide-react'
import { heritageSpots } from '../data/heritage-data'
import { openGuideCompanion } from '../guide/events'
import { findNearestRouteNode, findRoute } from './navigation'
import { ScenicWorld } from './ScenicWorld'
import { WorldMiniMap } from './WorldMiniMap'
import { formatHour } from './time-of-day'
import { recommendedRouteSpotIds, worldSpotById, worldSpots } from './world-data'
import type {
  PlayerState,
  GuideState,
  SpatialGuideContext,
  WorldCameraCommand,
  WorldHotspot,
  WorldNavigationMode,
  WorldSceneVariant,
  WorldSpotDefinition,
} from './types'
import './world.css'

type WorldExperienceProps = {
  currentSpotId: string | null
  variant: WorldSceneVariant
  onOpenSpot: (spotId: string) => void
  onContextChange: (context: SpatialGuideContext) => void
}

type ActivePhoto = {
  spot: WorldSpotDefinition
  hotspot: WorldHotspot
}

const heritageSpotById = new Map(heritageSpots.map((spot) => [spot.id, spot]))
const initialPlayerState: PlayerState = {
  position: [51, 0, 58],
  nearestSpotId: null,
  heading: Math.PI,
  isMoving: false,
}

const initialGuideState: GuideState = {
  mode: 'idle',
  position: [51, 0, 53],
  facingUser: false,
}

function readCurrentHour() {
  const now = new Date()
  return now.getHours() + now.getMinutes() / 60
}

function describeTime(hour: number) {
  if (hour < 5) return '深夜静园'
  if (hour < 8) return '晨光初起'
  if (hour < 17) return '日间游园'
  if (hour < 20) return '金色傍晚'
  return '夜游百泉'
}

export function WorldExperience({ currentSpotId, variant, onOpenSpot, onContextChange }: WorldExperienceProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(currentSpotId)
  const [navigationMode, setNavigationMode] = useState<WorldNavigationMode>(variant === 'detail' ? 'walk' : 'orbit')
  const [activePhoto, setActivePhoto] = useState<ActivePhoto | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [command, setCommand] = useState<WorldCameraCommand>({ id: 0, type: 'reset' })
  const [realHour, setRealHour] = useState(readCurrentHour)
  const [previewHour, setPreviewHour] = useState<number | null>(null)
  const [isTimePanelOpen, setIsTimePanelOpen] = useState(false)
  const [playerState, setPlayerState] = useState<PlayerState>(initialPlayerState)
  const [guideState, setGuideState] = useState<GuideState>(initialGuideState)
  const [guideMessage, setGuideMessage] = useState<string | null>(null)
  const [routeDestinationId, setRouteDestinationId] = useState<string | null>('weiyuan-temple')
  const sceneHour = previewHour ?? realHour

  useLayoutEffect(() => {
    // Reveal the shell as soon as its DOM is committed. Three.js can continue
    // warming up behind the route-level loading transition without trapping
    // users behind an overlay in throttled/background browser tabs.
    const reveal = window.setTimeout(() => setIsReady(true), 0)
    return () => window.clearTimeout(reveal)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setRealHour(readCurrentHour()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    onContextChange({
      enabled: true,
      scene: variant,
      navigationMode,
      focusedSpotId: selectedSpotId,
      hotspotId: activePhoto?.hotspot.id ?? null,
      hotspotLabel: activePhoto?.hotspot.label ?? null,
    })
  }, [activePhoto, navigationMode, onContextChange, selectedSpotId, variant])

  const selectedWorldSpot = selectedSpotId ? worldSpotById.get(selectedSpotId) ?? null : null
  const selectedHeritageSpot = selectedSpotId ? heritageSpotById.get(selectedSpotId) ?? null : null
  const selectedImage = selectedHeritageSpot?.images[0] ?? null
  const nearbySpot = playerState.nearestSpotId ? heritageSpotById.get(playerState.nearestSpotId) ?? null : null
  const routeOriginNodeId = findNearestRouteNode(playerState.position).id
  const activeRoute = useMemo(
    () => routeDestinationId ? findRoute(routeOriginNodeId, `spot:${routeDestinationId}`) : null,
    [routeDestinationId, routeOriginNodeId],
  )
  const worldSummary = useMemo(() => ({
    spots: worldSpots.length,
    photos: heritageSpots.reduce((total, spot) => total + spot.images.length, 0),
  }), [])

  function issueCommand(type: WorldCameraCommand['type']) {
    setCommand((current) => ({ id: current.id + 1, type }))
  }

  function handleSelectSpot(spotId: string) {
    const nextSpotId = worldSpotById.has(spotId) ? spotId : null
    setSelectedSpotId(nextSpotId)
    setActivePhoto(null)
  }

  function handleOpenHotspot(spot: WorldSpotDefinition, hotspot: WorldHotspot) {
    setSelectedSpotId(spot.id)
    setActivePhoto({ spot, hotspot })
  }

  function handleOpenFirstPhoto() {
    if (!selectedWorldSpot?.hotspots[0]) return
    setActivePhoto({ spot: selectedWorldSpot, hotspot: selectedWorldSpot.hotspots[0] })
  }

  function handleNavigateTo(spotId: string) {
    setRouteDestinationId(spotId)
    setSelectedSpotId(spotId)
  }

  function handleAskGuide() {
    const spotName = selectedHeritageSpot?.name ?? '百泉湖古建筑群'
    const hotspotName = activePhoto?.hotspot.label
    openGuideCompanion({
      mode: 'ask',
      prompt: hotspotName
        ? `我正在三维场景中查看${spotName}的“${hotspotName}”实景点位，请结合当前空间位置和项目资料讲解这里最值得注意的细节。`
        : `我正在三维场景中观察${spotName}，请结合当前空间位置、周边关系和项目资料进行现场讲解。`,
    })
  }

  async function handleFullscreen() {
    const root = rootRef.current
    if (!root) return
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await root.requestFullscreen()
    } catch {
      // Mobile browsers may reject fullscreen requests.
    }
  }

  return (
    <div
      ref={rootRef}
      className={`ea-world-experience is-${variant} is-${navigationMode} ${isReady ? 'is-ready' : ''}`}
      style={{ '--world-accent': selectedWorldSpot?.accent ?? '#b88a4b' } as CSSProperties}
      data-player-position={playerState.position.map((value) => value.toFixed(2)).join(',')}
      data-player-heading={playerState.heading.toFixed(3)}
      data-guide-mode={guideState.mode}
    >
      <ScenicWorld
        selectedSpotId={selectedSpotId}
        variant={variant}
        navigationMode={navigationMode}
        hour={sceneHour}
        command={command}
        route={activeRoute}
        playerState={playerState}
        targetSpotId={routeDestinationId}
        onSelectSpot={handleSelectSpot}
        onOpenHotspot={handleOpenHotspot}
        onPlayerState={setPlayerState}
        onGuideStateChange={(state, message) => {
          setGuideState(state)
          setGuideMessage(message)
        }}
        onReady={() => setIsReady(true)}
      />

      <div className="ea-world-loading" aria-hidden={isReady} aria-live="polite">
        <span />
        <strong>正在展开百泉湖数字孪生场景</strong>
        <small>校准湖岸、步道与建筑空间关系</small>
      </div>

      <div className="ea-world-status" aria-label="场景状态">
        <span><LocateFixed aria-hidden="true" /> 1 单位 = 1 米</span>
        <span>{navigationMode === 'walk' ? '胶囊碰撞 · 重力贴地' : '空中总览 · 景点分布'}</span>
      </div>

      <div className="ea-world-toolbar" aria-label="三维场景控制">
        <div className="ea-world-toolbar__modes" role="group" aria-label="浏览方式">
          <button type="button" className={navigationMode === 'orbit' ? 'is-active' : undefined} aria-pressed={navigationMode === 'orbit'} onClick={() => setNavigationMode('orbit')}>
            <Orbit aria-hidden="true" /><span>总览</span>
          </button>
          <button type="button" className={navigationMode === 'walk' ? 'is-active' : undefined} aria-pressed={navigationMode === 'walk'} onClick={() => setNavigationMode('walk')}>
            <Footprints aria-hidden="true" /><span>漫游</span>
          </button>
        </div>
        <button type="button" className={`ea-world-icon-button ${isTimePanelOpen ? 'is-active' : ''}`} title="时间预览" aria-label="时间预览" onClick={() => setIsTimePanelOpen((open) => !open)}>
          <Clock3 aria-hidden="true" />
        </button>
        <button type="button" className="ea-world-icon-button" title="重置视角" aria-label="重置视角" onClick={() => issueCommand('reset')}>
          <RotateCcw aria-hidden="true" />
        </button>
        <button type="button" className="ea-world-icon-button" title="全屏浏览" aria-label="全屏浏览" onClick={() => void handleFullscreen()}>
          <Maximize2 aria-hidden="true" />
        </button>
      </div>

      {isTimePanelOpen ? (
        <section className="ea-world-time" aria-label="景区时间预览">
          <div className="ea-world-time__head">
            <span><Sunrise aria-hidden="true" />{previewHour === null ? '实时同步' : '时间预览'}</span>
            <strong>{formatHour(sceneHour)}</strong>
          </div>
          <p>{describeTime(sceneHour)} · 太阳、天空、雾与灯笼同步变化</p>
          <input
            type="range"
            min="0"
            max="23.75"
            step="0.25"
            value={sceneHour}
            aria-label="预览时间"
            onChange={(event) => setPreviewHour(Number(event.target.value))}
          />
          <div className="ea-world-time__ticks"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
          <div className="ea-world-time__presets" role="group" aria-label="时间氛围预设">
            {[
              { label: '清晨', hour: 6.5 },
              { label: '白天', hour: 12 },
              { label: '傍晚', hour: 18.25 },
              { label: '夜晚', hour: 22 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={previewHour === preset.hour ? 'is-active' : undefined}
                onClick={() => setPreviewHour(preset.hour)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <button type="button" disabled={previewHour === null} onClick={() => setPreviewHour(null)}>
            <Clock3 aria-hidden="true" />回到当前时间 {formatHour(realHour)}
          </button>
        </section>
      ) : null}

      <section className="ea-world-route-panel" aria-label="路线导航">
        <div className="ea-world-route-panel__head">
          <span><Route aria-hidden="true" />推荐游览线</span>
          <button type="button" title="清除路线" aria-label="清除路线" onClick={() => setRouteDestinationId(null)}><X aria-hidden="true" /></button>
        </div>
        <p>{activeRoute ? `${activeRoute.distance} 米 · 约 ${activeRoute.estimatedMinutes} 分钟` : '请选择目标景点'}</p>
        <div className="ea-world-route-panel__stops">
          {recommendedRouteSpotIds.map((spotId, index) => {
            const spot = worldSpotById.get(spotId)
            if (!spot) return null
            return (
              <button key={spotId} type="button" className={routeDestinationId === spotId ? 'is-active' : undefined} onClick={() => handleNavigateTo(spotId)}>
                <span>{index + 1}</span>{spot.name}
              </button>
            )
          })}
        </div>
        <div className="ea-world-route-panel__links">
          <button type="button" onClick={() => { window.location.hash = '#/guide' }}><Compass aria-hidden="true" />导游路线</button>
          <button type="button" onClick={() => { window.location.hash = '#/visit' }}><Navigation aria-hidden="true" />预约到访</button>
          <button type="button" onClick={() => { window.location.hash = '#/' }}><Home aria-hidden="true" />首页</button>
        </div>
      </section>

      <WorldMiniMap
        playerState={playerState}
        guideState={guideState}
        route={activeRoute}
        navigationMode={navigationMode}
      />

      {navigationMode === 'walk' && guideMessage && (guideState.mode === 'explaining' || guideState.mode === 'waiting') ? (
        <aside className="ea-world-guide-toast" role="status" aria-live="polite">
          <div className="ea-world-guide-toast__portrait" aria-hidden="true">泉</div>
          <div>
            <span>泉上引游人 · {guideState.mode === 'explaining' ? '驻足讲解' : '等你同行'}</span>
            <p>{guideMessage}</p>
          </div>
        </aside>
      ) : null}

      {navigationMode === 'walk' ? (
        <>
          <div className="ea-world-walk-hint"><Footprints aria-hidden="true" />点击场景锁定视角 · WASD 行走 · Shift 快走 · Esc 释放</div>
          <div className="ea-world-walkpad" aria-label="漫游方向控制">
            <button type="button" title="向前" aria-label="向前" onClick={() => issueCommand('forward')}><ArrowUp aria-hidden="true" /></button>
            <button type="button" title="向左移动" aria-label="向左移动" onClick={() => issueCommand('left')}><ArrowLeft aria-hidden="true" /></button>
            <button type="button" title="向后" aria-label="向后" onClick={() => issueCommand('backward')}><ArrowDown aria-hidden="true" /></button>
            <button type="button" title="向右移动" aria-label="向右移动" onClick={() => issueCommand('right')}><ArrowRight aria-hidden="true" /></button>
            <button type="button" title="向左转" aria-label="向左转" onClick={() => issueCommand('turn-left')}><RotateCcw aria-hidden="true" /></button>
            <button type="button" title="向右转" aria-label="向右转" onClick={() => issueCommand('turn-right')}><RotateCw aria-hidden="true" /></button>
          </div>
        </>
      ) : null}

      {navigationMode === 'walk' && nearbySpot && nearbySpot.id !== selectedSpotId ? (
        <button type="button" className="ea-world-nearby" onClick={() => setSelectedSpotId(nearbySpot.id)}>
          <LocateFixed aria-hidden="true" /><span>附近景点<strong>{nearbySpot.name}</strong></span><small>点击查看</small>
        </button>
      ) : null}

      <aside className={`ea-world-place ${selectedHeritageSpot ? 'has-selection' : ''}`}>
        {selectedHeritageSpot ? (
          <>
            {selectedImage ? (
              <button type="button" className="ea-world-place__image" onClick={handleOpenFirstPhoto}>
                <img src={selectedImage.src} alt={selectedImage.alt} loading="lazy" />
                <span><ImageIcon aria-hidden="true" /> {selectedHeritageSpot.images.length}</span>
              </button>
            ) : null}
            <div className="ea-world-place__copy">
              <span>{selectedHeritageSpot.region}</span>
              <h2>{selectedHeritageSpot.name}</h2>
              <p>{selectedHeritageSpot.highlight}</p>
              <div className="ea-world-place__actions">
                <button type="button" onClick={() => handleNavigateTo(selectedHeritageSpot.id)}><Navigation aria-hidden="true" />导航到这里</button>
                {selectedHeritageSpot.id !== currentSpotId ? <button type="button" className="is-secondary" onClick={() => onOpenSpot(selectedHeritageSpot.id)}>进入景点</button> : null}
                <button type="button" className="is-icon" title="询问智能导游" aria-label="询问智能导游" onClick={handleAskGuide}><Sparkles aria-hidden="true" /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="ea-world-place__copy ea-world-place__copy--summary">
            <span>百泉湖数字孪生</span>
            <h2>湖、山、古建与步道一体导览</h2>
            <div className="ea-world-place__stats">
              <strong>{worldSummary.spots}<small>处景点</small></strong>
              <strong>{worldSummary.photos}<small>幅实景</small></strong>
            </div>
          </div>
        )}
      </aside>

      {activePhoto ? (
        <section className="ea-world-photo" role="dialog" aria-modal="false" aria-label={activePhoto.hotspot.label}>
          <button type="button" className="ea-world-photo__close" title="关闭实景档案" aria-label="关闭实景档案" onClick={() => setActivePhoto(null)}><X aria-hidden="true" /></button>
          <img src={activePhoto.hotspot.imageSrc} alt={activePhoto.hotspot.imageAlt} />
          <div>
            <span>实景对照 · {activePhoto.spot.name}</span>
            <h3>{activePhoto.hotspot.label}</h3>
            <p>{activePhoto.hotspot.description}</p>
            <button type="button" onClick={handleAskGuide}><Sparkles aria-hidden="true" />请导游讲解这一处</button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
