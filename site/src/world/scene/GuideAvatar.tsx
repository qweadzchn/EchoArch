import { useEffect, useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, MathUtils, Vector3, type Group } from 'three'
import { getWalkSurfaceHeight } from '../terrain'
import { routeNodeById, worldSpotById } from '../world-data'
import type { ComputedRoute, GuideState, PlayerState } from '../types'

type GuideAvatarProps = {
  route: ComputedRoute | null
  playerState: PlayerState
  targetSpotId: string | null
  onStateChange: (state: GuideState, message: string | null) => void
}

type GuideCheckpoint = {
  t: number
  message: string
}

function findClosestCurveT(curve: CatmullRomCurve3, position: Vector3, samples = 72) {
  let closestT = 0
  let closestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples
    const distance = curve.getPointAt(t).distanceToSquared(position)
    if (distance < closestDistance) {
      closestDistance = distance
      closestT = t
    }
  }
  return closestT
}

function modeLabel(mode: GuideState['mode']) {
  switch (mode) {
    case 'leading': return '正在引路'
    case 'explaining': return '驻足讲解'
    case 'waiting': return '等你同行'
    default: return '泉上候客'
  }
}

export function GuideAvatar({ route, playerState, targetSpotId, onStateChange }: GuideAvatarProps) {
  const guideRef = useRef<Group>(null)
  const leftLegRef = useRef<Group>(null)
  const rightLegRef = useRef<Group>(null)
  const leftArmRef = useRef<Group>(null)
  const rightArmRef = useRef<Group>(null)
  const progressRef = useRef(0)
  const modeRef = useRef<GuideState['mode']>('idle')
  const explainTimerRef = useRef(0)
  const checkpointIndexRef = useRef(0)
  const waitAnchorRef = useRef(new Vector3())
  const lastReportRef = useRef(0)
  const lastReportedModeRef = useRef<GuideState['mode']>('idle')
  const messageRef = useRef<string | null>(null)
  const playerStateRef = useRef(playerState)
  const modeLabelRef = useRef<HTMLSpanElement>(null)
  const routeKey = route?.nodeIds.join('>') ?? ''

  const curve = useMemo(() => {
    if (!route || route.points.length < 2) return null
    return new CatmullRomCurve3(
      route.points.map(([x, , z]) => new Vector3(x, getWalkSurfaceHeight(x, z), z)),
      false,
      'centripetal',
      0.18,
    )
  }, [route])

  const routeLength = useMemo(() => curve?.getLength() ?? 1, [curve])
  const checkpoints = useMemo<GuideCheckpoint[]>(() => {
    if (!curve || !route) return []
    const next: GuideCheckpoint[] = []
    for (const nodeId of route.nodeIds.slice(1)) {
      const node = routeNodeById.get(nodeId)
      if (!node?.spotId) continue
      const spot = worldSpotById.get(node.spotId)
      if (!spot) continue
      const nodePosition = new Vector3(
        node.position[0],
        getWalkSurfaceHeight(node.position[0], node.position[2]),
        node.position[2],
      )
      next.push({
        t: findClosestCurveT(curve, nodePosition),
        message: spot.guideScript ?? `前方到达${spot.name}，请留意建筑与湖山的关系。`,
      })
    }
    return next.sort((left, right) => left.t - right.t)
  }, [curve, route])

  useEffect(() => {
    playerStateRef.current = playerState
  }, [playerState])

  useEffect(() => {
    if (!curve) {
      modeRef.current = 'idle'
      return
    }
    const currentPlayerState = playerStateRef.current
    const playerPosition = new Vector3(...currentPlayerState.position)
    progressRef.current = findClosestCurveT(curve, playerPosition)
    checkpointIndexRef.current = checkpoints.findIndex((checkpoint) => checkpoint.t > progressRef.current + 0.025)
    if (checkpointIndexRef.current < 0) checkpointIndexRef.current = checkpoints.length
    modeRef.current = currentPlayerState.isMoving ? 'leading' : 'waiting'
    messageRef.current = null
    waitAnchorRef.current.copy(playerPosition)
    if (guideRef.current) {
      guideRef.current.position.copy(curve.getPointAt(Math.min(1, progressRef.current + 4.8 / routeLength)))
    }
  }, [checkpoints, curve, routeKey, routeLength])

  useFrame(({ clock }, deltaRaw) => {
    const guide = guideRef.current
    if (!guide || !curve || !route) return
    const delta = Math.min(deltaRaw, 0.05)
    const playerPosition = new Vector3(...playerState.position)
    const playerT = findClosestCurveT(curve, playerPosition, 52)
    const guideLead = Math.min(0.09, 5.5 / Math.max(1, routeLength))
    const desiredT = Math.min(1, playerT + guideLead)
    const currentMode = modeRef.current

    if (currentMode === 'explaining') {
      explainTimerRef.current -= delta
      if (explainTimerRef.current <= 0) {
        modeRef.current = 'waiting'
        waitAnchorRef.current.copy(playerPosition)
      }
    } else if (currentMode === 'waiting') {
      if (playerState.isMoving && playerPosition.distanceTo(waitAnchorRef.current) > 0.65) {
        modeRef.current = 'leading'
        messageRef.current = null
      }
    } else if (!playerState.isMoving) {
      modeRef.current = 'waiting'
      waitAnchorRef.current.copy(playerPosition)
    } else {
      const maxProgress = 3.9 * delta / Math.max(1, routeLength)
      progressRef.current = Math.min(desiredT, progressRef.current + maxProgress)
      const checkpoint = checkpoints[checkpointIndexRef.current]
      if (checkpoint && progressRef.current >= checkpoint.t - 0.012) {
        const checkpointPosition = curve.getPointAt(checkpoint.t)
        if (guide.position.distanceTo(checkpointPosition) < 2.2) {
          modeRef.current = 'explaining'
          explainTimerRef.current = 3.1
          messageRef.current = checkpoint.message
          checkpointIndexRef.current += 1
        }
      }
    }

    const desiredPosition = curve.getPointAt(progressRef.current)
    const remaining = guide.position.distanceTo(desiredPosition)
    if (remaining > 0.002 && modeRef.current === 'leading') {
      guide.position.lerp(desiredPosition, Math.min(1, (3.9 * delta) / remaining))
    }

    if (modeRef.current === 'leading') {
      const tangent = curve.getTangentAt(progressRef.current)
      guide.rotation.y = MathUtils.damp(
        guide.rotation.y,
        Math.atan2(tangent.x, tangent.z),
        9,
        delta,
      )
    } else {
      const dx = playerPosition.x - guide.position.x
      const dz = playerPosition.z - guide.position.z
      guide.rotation.y = MathUtils.damp(guide.rotation.y, Math.atan2(dx, dz), 10, delta)
    }

    const walking = modeRef.current === 'leading' && playerState.isMoving
    const stride = walking ? Math.sin(clock.elapsedTime * 7.2) * 0.46 : 0
    if (leftLegRef.current) leftLegRef.current.rotation.x = stride
    if (rightLegRef.current) rightLegRef.current.rotation.x = -stride
    if (leftArmRef.current) leftArmRef.current.rotation.x = -stride * 0.68
    if (rightArmRef.current) rightArmRef.current.rotation.x = stride * 0.68
    guide.position.y = desiredPosition.y + (walking ? Math.abs(Math.sin(clock.elapsedTime * 7.2)) * 0.025 : 0)

    const modeChanged = modeRef.current !== lastReportedModeRef.current
    if (modeChanged || clock.elapsedTime - lastReportRef.current > 0.28) {
      lastReportRef.current = clock.elapsedTime
      lastReportedModeRef.current = modeRef.current
      if (modeLabelRef.current) modeLabelRef.current.textContent = modeLabel(modeRef.current)
      onStateChange({
        mode: modeRef.current,
        currentRouteId: routeKey || undefined,
        currentTargetSpotId: targetSpotId ?? undefined,
        position: [guide.position.x, guide.position.y, guide.position.z],
        facingUser: modeRef.current !== 'leading',
      }, messageRef.current)
    }
  })

  if (!curve || !route) return null

  return (
    <group ref={guideRef} scale={0.72}>
      <group>
        <group ref={leftLegRef} position={[-0.17, 0.92, 0]}>
          <mesh position={[0, -0.43, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.86, 7]} />
            <meshStandardMaterial color="#2c3636" roughness={0.86} />
          </mesh>
          <mesh position={[0, -0.88, 0.1]} castShadow>
            <boxGeometry args={[0.22, 0.13, 0.38]} />
            <meshStandardMaterial color="#252321" roughness={0.92} />
          </mesh>
        </group>
        <group ref={rightLegRef} position={[0.17, 0.92, 0]}>
          <mesh position={[0, -0.43, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.86, 7]} />
            <meshStandardMaterial color="#2c3636" roughness={0.86} />
          </mesh>
          <mesh position={[0, -0.88, 0.1]} castShadow>
            <boxGeometry args={[0.22, 0.13, 0.38]} />
            <meshStandardMaterial color="#252321" roughness={0.92} />
          </mesh>
        </group>

        <mesh position={[0, 1.32, 0]} castShadow>
          <cylinderGeometry args={[0.39, 0.53, 1.05, 8]} />
          <meshStandardMaterial color="#315d55" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.5, 0.43]} castShadow>
          <boxGeometry args={[0.66, 0.12, 0.08]} />
          <meshStandardMaterial color="#d1ac68" roughness={0.72} />
        </mesh>
        <mesh position={[0, 1.05, 0.06]} rotation={[0, 0, -0.12]} castShadow>
          <boxGeometry args={[0.7, 0.1, 0.08]} />
          <meshStandardMaterial color="#b74435" roughness={0.76} />
        </mesh>

        <group ref={leftArmRef} position={[-0.46, 1.7, 0]} rotation={[0, 0, -0.14]}>
          <mesh position={[0, -0.38, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.1, 0.78, 7]} />
            <meshStandardMaterial color="#315d55" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.79, 0]} castShadow>
            <sphereGeometry args={[0.115, 8, 6]} />
            <meshStandardMaterial color="#c99372" roughness={0.76} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.46, 1.7, 0]} rotation={[0, 0, 0.14]}>
          <mesh position={[0, -0.38, 0]} castShadow>
            <cylinderGeometry args={[0.085, 0.1, 0.78, 7]} />
            <meshStandardMaterial color="#315d55" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.79, 0]} castShadow>
            <sphereGeometry args={[0.115, 8, 6]} />
            <meshStandardMaterial color="#c99372" roughness={0.76} />
          </mesh>
        </group>

        <mesh position={[0, 2.18, 0]} castShadow>
          <sphereGeometry args={[0.31, 12, 9]} />
          <meshStandardMaterial color="#c99372" roughness={0.74} />
        </mesh>
        <mesh position={[0, 2.37, -0.02]} scale={[1, 0.56, 1]} castShadow>
          <sphereGeometry args={[0.33, 10, 7]} />
          <meshStandardMaterial color="#252825" roughness={0.9} />
        </mesh>
        <mesh position={[0, 2.49, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.34, 0.14, 12]} />
          <meshStandardMaterial color="#263f3b" roughness={0.82} />
        </mesh>
        <mesh position={[0, 2.59, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.25, 0.24, 10]} />
          <meshStandardMaterial color="#315d55" roughness={0.82} />
        </mesh>
      </group>

      <Html center position={[0, 3.05, 0]} distanceFactor={9} zIndexRange={[32, 12]}>
        <div className="ea-guide-avatar-label">
          <strong>泉上引游人</strong>
          <span ref={modeLabelRef}>泉上候客</span>
        </div>
      </Html>
    </group>
  )
}
