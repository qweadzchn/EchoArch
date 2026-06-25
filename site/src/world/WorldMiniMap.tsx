import { lakePolygons } from './terrain'
import { worldBounds, worldSpots } from './world-data'
import type { ComputedRoute, GuideState, PlayerState, WorldNavigationMode } from './types'

function mapX(x: number) {
  return x - worldBounds.minX
}

function mapY(z: number) {
  return z - worldBounds.minZ
}

export function WorldMiniMap({ playerState, guideState, route, navigationMode }: {
  playerState: PlayerState
  guideState: GuideState
  route: ComputedRoute | null
  navigationMode: WorldNavigationMode
}) {
  const routePoints = route?.points.map(([x, , z]) => `${mapX(x)},${mapY(z)}`).join(' ') ?? ''
  const target = route?.points[route.points.length - 1]
  const headingDegrees = (-playerState.heading * 180) / Math.PI

  return (
    <aside className={`ea-world-minimap is-${navigationMode}`} aria-label="景区小地图">
      <div className="ea-world-minimap__head">
        <span>百泉导览图</span>
        <small>{navigationMode === 'walk' ? '当前位置' : '全景方位'}</small>
      </div>
      <svg viewBox={`0 0 ${worldBounds.width} ${worldBounds.depth}`} role="img" aria-label="当前位置、目标景点和推荐路线">
        <rect width={worldBounds.width} height={worldBounds.depth} rx="7" className="ea-minimap-land" />
        {lakePolygons.map((lake) => (
          <polygon
            key={lake.id}
            points={lake.points.map(([x, z]) => `${mapX(x)},${mapY(z)}`).join(' ')}
            className="ea-minimap-water"
          />
        ))}
        {routePoints ? <polyline points={routePoints} className="ea-minimap-route" /> : null}
        {worldSpots.map((spot) => (
          <circle key={spot.id} cx={mapX(spot.position[0])} cy={mapY(spot.position[2])} r="1.25" className="ea-minimap-spot" />
        ))}
        {target ? <circle cx={mapX(target[0])} cy={mapY(target[2])} r="2.7" className="ea-minimap-target" /> : null}
        {guideState.mode !== 'idle' ? (
          <circle cx={mapX(guideState.position[0])} cy={mapY(guideState.position[2])} r="2.05" className="ea-minimap-guide" />
        ) : null}
        <g transform={`translate(${mapX(playerState.position[0])} ${mapY(playerState.position[2])}) rotate(${headingDegrees})`}>
          <path d="M 0 -4 L 3.1 3 L 0 1.8 L -3.1 3 Z" className="ea-minimap-player" />
        </g>
      </svg>
      <div className="ea-world-minimap__legend"><i />当前位置 <i />目标 <i />路线</div>
    </aside>
  )
}
