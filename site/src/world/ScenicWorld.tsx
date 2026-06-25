import { Suspense, useCallback, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { CameraControls } from '@react-three/drei'
import type { CameraControls as CameraControlsType } from '@react-three/drei'
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  MathUtils,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { WalkController } from './controls/WalkController'
import { ArchitectureLighting, HeritageBuilding } from './scene/Architecture'
import { RouteOverlay } from './scene/RouteOverlay'
import { ScenicEnvironment } from './scene/ScenicEnvironment'
import { SpotLabels } from './scene/SpotLabels'
import { GuideAvatar } from './scene/GuideAvatar'
import { getAtmosphere } from './time-of-day'
import { worldBounds, worldSpotById, worldSpots } from './world-data'
import type {
  ComputedRoute,
  GuideState,
  PlayerState,
  WorldCameraCommand,
  WorldHotspot,
  WorldNavigationMode,
  WorldSceneVariant,
  WorldSpotDefinition,
} from './types'

type ScenicWorldProps = {
  selectedSpotId: string | null
  variant: WorldSceneVariant
  navigationMode: WorldNavigationMode
  hour: number
  command: WorldCameraCommand
  route: ComputedRoute | null
  playerState: PlayerState
  targetSpotId: string | null
  onSelectSpot: (spotId: string) => void
  onOpenHotspot: (spot: WorldSpotDefinition, hotspot: WorldHotspot) => void
  onPlayerState: (state: PlayerState) => void
  onGuideStateChange: (state: GuideState, message: string | null) => void
  onReady: () => void
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady])
  return null
}

function NativePostProcessing({ hour }: { hour: number }) {
  const { camera, gl, scene, size } = useThree()
  const bloomRef = useRef<UnrealBloomPass | null>(null)
  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl)
    composer.addPass(new RenderPass(scene, camera))
    const fxaa = new ShaderPass(FXAAShader)
    const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.24, 0.42, 0.92)
    composer.addPass(fxaa)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())
    return { composer, fxaa, bloom }
  }, [camera, gl, scene])

  useEffect(() => {
    bloomRef.current = pipeline.bloom
    return () => { bloomRef.current = null }
  }, [pipeline])

  useEffect(() => {
    const pixelRatio = Math.min(gl.getPixelRatio(), 1.55)
    pipeline.composer.setPixelRatio(pixelRatio)
    pipeline.composer.setSize(size.width, size.height)
    pipeline.bloom.setSize(size.width, size.height)
    pipeline.fxaa.material.uniforms.resolution.value.set(
      1 / Math.max(1, size.width * pixelRatio),
      1 / Math.max(1, size.height * pixelRatio),
    )
  }, [gl, pipeline, size])

  useEffect(() => {
    const atmosphere = getAtmosphere(hour)
    const bloom = bloomRef.current
    if (!bloom) return
    bloom.strength = atmosphere.bloomStrength
    bloom.threshold = atmosphere.bloomThreshold
    bloom.radius = 0.28
  }, [hour])

  useEffect(() => () => pipeline.composer.dispose(), [pipeline])
  useFrame(() => pipeline.composer.render(), 1)
  return null
}

function OrbitCamera({ selectedSpotId, variant, command }: {
  selectedSpotId: string | null
  variant: WorldSceneVariant
  command: WorldCameraCommand
}) {
  const controlsRef = useRef<CameraControlsType>(null)
  const sceneDiagonal = Math.hypot(worldBounds.width, worldBounds.depth)

  const showOverview = useCallback((transition: boolean) => {
    const controls = controlsRef.current
    if (!controls) return
    const target = new Vector3(0, 2.4, 7)
    const direction = new Vector3(0.52, 0.66, 0.54).normalize()
    const distance = MathUtils.clamp(sceneDiagonal * 0.64, 110, 142)
    const position = target.clone().add(direction.multiplyScalar(distance))
    void controls.setLookAt(
      position.x,
      position.y,
      position.z,
      target.x,
      target.y,
      target.z,
      transition,
    )
  }, [sceneDiagonal])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.setBoundary(new Box3(
      new Vector3(worldBounds.minX + 13, -1, worldBounds.minZ + 10),
      new Vector3(worldBounds.maxX - 13, 18, worldBounds.maxZ - 10),
    ))
    controls.boundaryEnclosesCamera = false
    return () => controls.setBoundary(undefined)
  }, [])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const spot = selectedSpotId ? worldSpotById.get(selectedSpotId) ?? null : null
    if (!spot && variant === 'overview') {
      showOverview(true)
      return
    }
    if (!spot) return
    const [x, , z] = spot.position
    const distance = variant === 'detail' ? 18 : 25
    void controls.setLookAt(x + distance, variant === 'detail' ? 14 : 20, z + distance, x, 2.7, z, true)
  }, [selectedSpotId, showOverview, variant])

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls || command.id === 0) return
    if (command.type === 'reset') {
      const spot = selectedSpotId ? worldSpotById.get(selectedSpotId) ?? null : null
      if (spot) {
        void controls.setLookAt(spot.position[0] + 24, 19, spot.position[2] + 24, spot.position[0], 2.5, spot.position[2], true)
      } else {
        showOverview(true)
      }
    }
  }, [command, selectedSpotId, showOverview])

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={variant === 'overview' ? 24 : 13}
      maxDistance={Math.min(148, sceneDiagonal * 0.69)}
      minPolarAngle={Math.PI * 0.16}
      maxPolarAngle={Math.PI * 0.455}
      smoothTime={0.72}
      draggingSmoothTime={0.12}
      dollyToCursor={false}
      truckSpeed={0.62}
    />
  )
}

function WorldSceneContent(props: Omit<ScenicWorldProps, 'onReady'> & { lowPowerDevice?: boolean }) {
  return (
    <>
      <ScenicEnvironment hour={props.hour} />
      {worldSpots.map((spot) => (
        <HeritageBuilding
          key={spot.id}
          definition={spot}
          isSelected={spot.id === props.selectedSpotId}
          onSelect={() => props.onSelectSpot(spot.id)}
        />
      ))}
      <ArchitectureLighting hour={props.hour} />
      <RouteOverlay route={props.route} navigationMode={props.navigationMode} />
      <SpotLabels
        selectedSpotId={props.selectedSpotId}
        navigationMode={props.navigationMode}
        onSelectSpot={props.onSelectSpot}
        onOpenHotspot={props.onOpenHotspot}
      />
      {props.navigationMode === 'walk' ? (
        <>
          <WalkController
            selectedSpotId={props.selectedSpotId}
            command={props.command}
            onPlayerState={props.onPlayerState}
          />
          <GuideAvatar
            route={props.route}
            playerState={props.playerState}
            targetSpotId={props.targetSpotId}
            onStateChange={props.onGuideStateChange}
          />
        </>
      ) : (
        <OrbitCamera selectedSpotId={props.selectedSpotId} variant={props.variant} command={props.command} />
      )}
      {!props.lowPowerDevice ? <NativePostProcessing hour={props.hour} /> : null}
    </>
  )
}

export function ScenicWorld({ onReady, ...props }: ScenicWorldProps) {
  const lowPowerDevice = typeof window !== 'undefined' && (
    window.innerWidth < 760 || (navigator.hardwareConcurrency ?? 8) <= 4
  )

  return (
    <Canvas
      className="ea-world-canvas"
      fallback={
        <div className="ea-world-fallback" role="status">
          <strong>当前设备未能启用三维视图</strong>
          <span>可使用右上角 2D 继续浏览完整内容</span>
        </div>
      }
      camera={{ position: [74, 88, 84], fov: 43, near: 0.5, far: 360 }}
      dpr={[1, lowPowerDevice ? 1.15 : 1.55]}
      frameloop="always"
      performance={{ min: 0.55, debounce: 220 }}
      shadows={lowPowerDevice ? false : 'percentage'}
      gl={{
        antialias: false,
        alpha: false,
        powerPreference: 'high-performance',
        toneMapping: ACESFilmicToneMapping,
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace
        gl.setClearColor(new Color('#91aaa1'))
      }}
      onPointerMissed={() => {
        if (props.navigationMode === 'orbit' && props.variant === 'overview') props.onSelectSpot('')
      }}
    >
      <ReadySignal onReady={onReady} />
      <Suspense fallback={null}>
        <WorldSceneContent {...props} lowPowerDevice={lowPowerDevice} />
      </Suspense>
    </Canvas>
  )
}
