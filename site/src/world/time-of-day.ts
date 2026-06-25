import { Color, MathUtils, Vector3 } from 'three'

export type AtmospherePhase = 'night' | 'dawn' | 'day' | 'dusk'

export type Atmosphere = {
  phase: AtmospherePhase
  background: Color
  fog: Color
  fogNear: number
  fogFar: number
  ambient: Color
  sun: Color
  sunPosition: Vector3
  sunIntensity: number
  ambientIntensity: number
  hemisphereIntensity: number
  exposure: number
  starOpacity: number
  artificialLight: number
  skyTop: Color
  skyHorizon: Color
  waterDeep: Color
  waterShallow: Color
  waterSunStrength: number
  waterOpacity: number
  bloomStrength: number
  bloomThreshold: number
}

type AtmospherePreset = Omit<Atmosphere, 'phase' | 'sunPosition'>

const presets: Record<AtmospherePhase, AtmospherePreset> = {
  dawn: {
    background: new Color('#81979a'),
    fog: new Color('#718883'),
    fogNear: 125,
    fogFar: 285,
    ambient: new Color('#d6c8ae'),
    sun: new Color('#efa875'),
    sunIntensity: 1.25,
    ambientIntensity: 0.56,
    hemisphereIntensity: 0.44,
    exposure: 0.84,
    starOpacity: 0.08,
    artificialLight: 0.38,
    skyTop: new Color('#526f7d'),
    skyHorizon: new Color('#bd9277'),
    waterDeep: new Color('#17424d'),
    waterShallow: new Color('#426d69'),
    waterSunStrength: 0.07,
    waterOpacity: 0.84,
    bloomStrength: 0.1,
    bloomThreshold: 1.15,
  },
  day: {
    background: new Color('#79a1aa'),
    fog: new Color('#708985'),
    fogNear: 165,
    fogFar: 330,
    ambient: new Color('#dce2d0'),
    sun: new Color('#f5dfb4'),
    sunIntensity: 2.05,
    ambientIntensity: 0.64,
    hemisphereIntensity: 0.56,
    exposure: 0.9,
    starOpacity: 0,
    artificialLight: 0,
    skyTop: new Color('#527f91'),
    skyHorizon: new Color('#9eb2ad'),
    waterDeep: new Color('#174651'),
    waterShallow: new Color('#4d7c74'),
    waterSunStrength: 0.085,
    waterOpacity: 0.85,
    bloomStrength: 0.06,
    bloomThreshold: 1.28,
  },
  dusk: {
    background: new Color('#6d7476'),
    fog: new Color('#626e6b'),
    fogNear: 135,
    fogFar: 290,
    ambient: new Color('#b9aaa0'),
    sun: new Color('#e29769'),
    sunIntensity: 0.92,
    ambientIntensity: 0.48,
    hemisphereIntensity: 0.38,
    exposure: 0.8,
    starOpacity: 0.16,
    artificialLight: 0.68,
    skyTop: new Color('#435b69'),
    skyHorizon: new Color('#a27467'),
    waterDeep: new Color('#102e3a'),
    waterShallow: new Color('#34535a'),
    waterSunStrength: 0.045,
    waterOpacity: 0.84,
    bloomStrength: 0.1,
    bloomThreshold: 1.12,
  },
  night: {
    background: new Color('#10242e'),
    fog: new Color('#1b3438'),
    fogNear: 110,
    fogFar: 270,
    ambient: new Color('#9eafc2'),
    sun: new Color('#c2cee4'),
    sunIntensity: 0.82,
    ambientIntensity: 0.58,
    hemisphereIntensity: 0.5,
    exposure: 0.9,
    starOpacity: 0.82,
    artificialLight: 1,
    skyTop: new Color('#0a1824'),
    skyHorizon: new Color('#203b43'),
    waterDeep: new Color('#061822'),
    waterShallow: new Color('#132e37'),
    waterSunStrength: 0.022,
    waterOpacity: 0.82,
    bloomStrength: 0.12,
    bloomThreshold: 1.08,
  },
}

export function normalizeHour(hour: number) {
  return ((hour % 24) + 24) % 24
}

export function formatHour(hour: number) {
  const normalized = normalizeHour(hour)
  const hours = Math.floor(normalized)
  const minutes = Math.round((normalized - hours) * 60) % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function getAtmospherePhase(hourInput: number): AtmospherePhase {
  const hour = normalizeHour(hourInput)
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  return 'night'
}

export function getAtmosphere(hourInput: number): Atmosphere {
  const hour = normalizeHour(hourInput)
  const phase = getAtmospherePhase(hour)
  const preset = presets[phase]
  const solarAngle = ((hour - 6) / 24) * Math.PI * 2
  const solarHeight = Math.sin(solarAngle)
  const solarAzimuth = ((hour - 12) / 24) * Math.PI * 2
  const sunPosition = phase === 'night'
    ? new Vector3(-46, 54, 28)
    : new Vector3(
      Math.cos(solarAzimuth) * 78,
      Math.max(7, solarHeight * 70),
      Math.sin(solarAzimuth) * 64,
    )

  return {
    phase,
    ...preset,
    sunPosition,
  }
}

export function getArtificialLightLevel(hour: number) {
  return MathUtils.clamp(getAtmosphere(hour).artificialLight, 0, 1)
}
