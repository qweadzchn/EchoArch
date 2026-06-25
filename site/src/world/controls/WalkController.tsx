import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Vector2 } from 'three'
import { findNearestRouteNode } from '../navigation'
import { getWalkSurfaceHeight, resolveWalkPosition } from '../terrain'
import { routeNodeById, worldSpotById, worldSpots } from '../world-data'
import type { PlayerState, WorldCameraCommand } from '../types'
import { getHorizontalMovement } from './movement'

const EYE_HEIGHT = 1.72
const WALK_SPEED = 4.25
const SPRINT_SPEED = 6.2

export function WalkController({ selectedSpotId, command, onPlayerState }: {
  selectedSpotId: string | null
  command: WorldCameraCommand
  onPlayerState: (state: PlayerState) => void
}) {
  const { camera, gl } = useThree()
  const keys = useRef(new Set<string>())
  const yaw = useRef(0)
  const pitch = useRef(-0.04)
  const position = useRef(new Vector2())
  const verticalVelocity = useRef(0)
  const bobTime = useRef(0)
  const lastCommandId = useRef(0)
  const lastReport = useRef(0)
  const moveImpulse = useRef(new Vector2())
  const initialSpotId = useRef(selectedSpotId)
  const touchLook = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const selected = initialSpotId.current ? worldSpotById.get(initialSpotId.current) : null
    const spawnNode = selected
      ? findNearestRouteNode(selected.position)
      : routeNodeById.get('gate:south')
    const spawn = spawnNode?.position ?? [51, 0, 58]
    position.current.set(spawn[0], spawn[2])
    camera.position.set(spawn[0], getWalkSurfaceHeight(spawn[0], spawn[2]) + EYE_HEIGHT, spawn[2])
    // Three.js cameras look along local -Z. At the south gate yaw 0 therefore
    // faces north into the park; selected-spot spawns use the same convention.
    yaw.current = selected
      ? Math.atan2(spawn[0] - selected.position[0], spawn[2] - selected.position[2])
      : 0
    pitch.current = -0.04
    verticalVelocity.current = 0
  }, [camera])

  useEffect(() => {
    const canvas = gl.domElement
    const pressedKeys = keys.current
    const onKeyDown = (event: KeyboardEvent) => pressedKeys.add(event.code)
    const onKeyUp = (event: KeyboardEvent) => pressedKeys.delete(event.code)
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return
      yaw.current -= event.movementX * 0.0022
      pitch.current = MathUtils.clamp(pitch.current - event.movementY * 0.0019, -1.08, 1.08)
    }
    const onCanvasClick = () => {
      if (document.pointerLockElement !== canvas && canvas.requestPointerLock) {
        void canvas.requestPointerLock()
      }
    }
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return
      touchLook.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
    }
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !touchLook.current) return
      const next = { x: event.touches[0].clientX, y: event.touches[0].clientY }
      yaw.current -= (next.x - touchLook.current.x) * 0.006
      pitch.current = MathUtils.clamp(pitch.current - (next.y - touchLook.current.y) * 0.0048, -1.08, 1.08)
      touchLook.current = next
      event.preventDefault()
    }
    const onTouchEnd = () => { touchLook.current = null }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('click', onCanvasClick)
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('click', onCanvasClick)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      pressedKeys.clear()
      if (document.pointerLockElement === canvas) document.exitPointerLock()
    }
  }, [gl])

  useEffect(() => {
    if (command.id === 0 || command.id === lastCommandId.current) return
    lastCommandId.current = command.id
    const impulse = moveImpulse.current
    switch (command.type) {
      case 'forward': impulse.y += 1.8; break
      case 'backward': impulse.y -= 1.8; break
      case 'left': impulse.x -= 1.5; break
      case 'right': impulse.x += 1.5; break
      case 'turn-left': yaw.current += MathUtils.degToRad(16); break
      case 'turn-right': yaw.current -= MathUtils.degToRad(16); break
      case 'reset': {
        const node = routeNodeById.get('gate:south')
        if (node) position.current.set(node.position[0], node.position[2])
        break
      }
    }
  }, [command])

  useFrame((state, deltaRaw) => {
    const delta = Math.min(deltaRaw, 0.05)
    const keySet = keys.current
    const forwardInput = (keySet.has('KeyW') || keySet.has('ArrowUp') ? 1 : 0) - (keySet.has('KeyS') || keySet.has('ArrowDown') ? 1 : 0)
    const sideInput = (keySet.has('KeyD') || keySet.has('ArrowRight') ? 1 : 0) - (keySet.has('KeyA') || keySet.has('ArrowLeft') ? 1 : 0)
    const impulse = moveImpulse.current
    const localMove = new Vector2(sideInput + impulse.x, forwardInput + impulse.y)
    const moving = localMove.lengthSq() > 0.0001
    const speed = keySet.has('ShiftLeft') || keySet.has('ShiftRight') ? SPRINT_SPEED : WALK_SPEED
    const horizontalMove = getHorizontalMovement(yaw.current, localMove.x, localMove.y)
    const dx = horizontalMove.x * speed * delta
    const dz = horizontalMove.z * speed * delta
    const requested = new Vector2(position.current.x + dx, position.current.y + dz)
    position.current.copy(resolveWalkPosition(position.current, requested))
    impulse.multiplyScalar(Math.pow(0.0008, delta))

    const groundY = getWalkSurfaceHeight(position.current.x, position.current.y) + EYE_HEIGHT
    verticalVelocity.current -= 9.8 * delta
    let cameraY = camera.position.y + verticalVelocity.current * delta
    if (cameraY <= groundY || groundY - cameraY < 0.42) {
      cameraY = MathUtils.damp(cameraY, groundY, 18, delta)
      verticalVelocity.current = 0
    }

    bobTime.current += moving ? delta * speed * 1.7 : delta * 2.2
    const bob = moving ? Math.sin(bobTime.current) * 0.027 : Math.sin(bobTime.current) * 0.004
    camera.position.set(position.current.x, cameraY + bob, position.current.y)
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')

    if (state.clock.elapsedTime - lastReport.current > 0.24) {
      lastReport.current = state.clock.elapsedTime
      let nearestSpotId: string | null = null
      let nearestDistance = Number.POSITIVE_INFINITY
      for (const spot of worldSpots) {
        const distance = Math.hypot(spot.position[0] - position.current.x, spot.position[2] - position.current.y)
        if (distance < nearestDistance) {
          nearestDistance = distance
          nearestSpotId = distance <= 18 ? spot.id : null
        }
      }
      onPlayerState({
        position: [position.current.x, getWalkSurfaceHeight(position.current.x, position.current.y), position.current.y],
        nearestSpotId,
        heading: yaw.current,
        isMoving: moving,
      })
    }
  })

  return null
}
