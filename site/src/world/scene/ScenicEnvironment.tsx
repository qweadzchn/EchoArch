import { useEffect, useMemo, useRef } from 'react'
import { Line, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  BackSide,
  DoubleSide,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  type InstancedMesh,
} from 'three'
import { scenicGraph } from '../world-data'
import { getAtmosphere } from '../time-of-day'
import {
  getTerrainHeight,
  isInLake,
  lakePolygons,
  treePlacements,
} from '../terrain'

const waterVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vUv = uv;
    vec3 p = position;
    float wave = sin(p.x * 0.18 + uTime * 0.7) * 0.10;
    wave += cos(p.z * 0.22 - uTime * 0.52) * 0.08;
    wave += sin((p.x + p.z) * 0.09 + uTime * 0.34) * 0.05;
    p.y += wave;
    vWave = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const waterFragmentShader = `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSun;
  uniform float uSunStrength;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    float ripple = sin((vUv.x * 33.0 + vUv.y * 21.0) + uTime * 0.55) * 0.035;
    float sheen = smoothstep(0.145, 0.22, vWave + ripple);
    vec3 color = mix(uDeep, uShallow, clamp(0.2 + vUv.y * 0.16 + ripple, 0.08, 0.42));
    color += uSun * sheen * uSunStrength;
    float edge = smoothstep(0.0, 0.075, min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y)));
    gl_FragColor = vec4(clamp(color, 0.0, 0.72), uOpacity * (0.94 + edge * 0.06));
  }
`

const skyVertexShader = `
  varying float vHeight;
  void main() {
    vHeight = normalize(position).y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFragmentShader = `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  varying float vHeight;
  void main() {
    float blend = smoothstep(-0.12, 0.72, vHeight);
    vec3 color = mix(uHorizon, uTop, blend);
    gl_FragColor = vec4(color, 1.0);
  }
`

function AtmosphereSky({ hour }: { hour: number }) {
  const atmosphere = useMemo(() => getAtmosphere(hour), [hour])
  const material = useMemo(() => new ShaderMaterial({
    vertexShader: skyVertexShader,
    fragmentShader: skyFragmentShader,
    uniforms: {
      uTop: { value: new Color('#527f91') },
      uHorizon: { value: new Color('#9eb2ad') },
    },
    side: BackSide,
    depthWrite: false,
  }), [])

  useEffect(() => {
    material.uniforms.uTop.value.copy(atmosphere.skyTop)
    material.uniforms.uHorizon.value.copy(atmosphere.skyHorizon)
  }, [atmosphere, material])

  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh material={material} renderOrder={-2} frustumCulled={false}>
      <sphereGeometry args={[350, 32, 18]} />
    </mesh>
  )
}

function DynamicWater({ hour }: { hour: number }) {
  const materialsRef = useRef<ShaderMaterial[]>([])
  const atmosphere = useMemo(() => getAtmosphere(hour), [hour])
  const materials = useMemo(() => lakePolygons.map(() => new ShaderMaterial({
    vertexShader: waterVertexShader,
    fragmentShader: waterFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new Color('#285f67') },
      uShallow: { value: new Color('#6daba0') },
      uSun: { value: new Color('#fff0c4') },
      uSunStrength: { value: 0.06 },
      uOpacity: { value: 0.84 },
    },
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
  })), [])

  const geometries = useMemo(() => lakePolygons.map((lake) => {
    const shape = new Shape()
    lake.points.forEach(([x, z], index) => {
      if (index === 0) shape.moveTo(x, -z)
      else shape.lineTo(x, -z)
    })
    shape.closePath()
    const geometry = new ShapeGeometry(shape, 8)
    geometry.rotateX(-Math.PI / 2)
    return geometry
  }), [])

  useEffect(() => {
    materialsRef.current = materials
    materials.forEach((material) => {
      material.uniforms.uDeep.value.copy(atmosphere.waterDeep)
      material.uniforms.uShallow.value.copy(atmosphere.waterShallow)
      material.uniforms.uSun.value.copy(atmosphere.sun)
      material.uniforms.uSunStrength.value = atmosphere.waterSunStrength
      material.uniforms.uOpacity.value = atmosphere.waterOpacity
    })
  }, [atmosphere, materials])

  useEffect(() => () => {
    materials.forEach((material) => material.dispose())
    geometries.forEach((geometry) => geometry.dispose())
  }, [geometries, materials])

  useFrame(({ clock }) => {
    materialsRef.current.forEach((material) => {
      material.uniforms.uTime.value = clock.elapsedTime
    })
  })

  return (
    <group position={[0, 0.13, 0]}>
      {geometries.map((geometry, index) => (
        <mesh key={lakePolygons[index].id} geometry={geometry} material={materials[index]} receiveShadow />
      ))}
    </group>
  )
}

function Terrain() {
  const geometry = useMemo(() => {
    const next = new PlaneGeometry(190, 138, 76, 56)
    next.rotateX(-Math.PI / 2)
    const position = next.attributes.position
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index)
      const z = position.getZ(index)
      position.setY(index, isInLake(x, z) ? -1.25 : getTerrainHeight(x, z))
    }
    position.needsUpdate = true
    next.computeVertexNormals()
    return next
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#617661" roughness={0.98} metalness={0} vertexColors={false} />
    </mesh>
  )
}

function ScenicRoads() {
  return (
    <group>
      {scenicGraph.edges.flatMap((edge) => edge.path.slice(1).map((point, index) => {
        const start = edge.path[index]
        const [ax, , az] = start
        const [bx, , bz] = point
        const length = Math.hypot(bx - ax, bz - az)
        const midX = (ax + bx) / 2
        const midZ = (az + bz) / 2
        const bridge = edge.kind === 'bridge' || edge.kind === 'boardwalk'
        const y = bridge && isInLake(midX, midZ) ? 0.32 : getTerrainHeight(midX, midZ) + 0.07
        const width = edge.kind === 'path' ? 2.65 : edge.kind === 'steps' ? 2.1 : 2.25
        return (
          <mesh
            key={`${edge.from}-${edge.to}-${index}`}
            position={[midX, y, midZ]}
            rotation={[0, -Math.atan2(bz - az, bx - ax), 0]}
            receiveShadow
            castShadow={bridge}
          >
            <boxGeometry args={[length + 0.3, bridge ? 0.18 : 0.09, width]} />
            <meshStandardMaterial color={bridge ? '#9b9482' : '#b8a985'} roughness={0.94} />
          </mesh>
        )
      }))}
    </group>
  )
}

function TreeInstances() {
  const trunkRef = useRef<InstancedMesh>(null)
  const crownRef = useRef<InstancedMesh>(null)
  const crownTopRef = useRef<InstancedMesh>(null)

  useEffect(() => {
    const trunk = trunkRef.current
    const crown = crownRef.current
    const crownTop = crownTopRef.current
    if (!trunk || !crown || !crownTop) return
    const object = new Object3D()

    treePlacements.forEach(({ x, z, scale }, index) => {
      const y = getTerrainHeight(x, z)
      object.position.set(x, y + 1.05 * scale, z)
      object.scale.set(scale, scale, scale)
      object.rotation.y = index * 0.71
      object.updateMatrix()
      trunk.setMatrixAt(index, object.matrix)

      object.position.set(x, y + 3.15 * scale, z)
      object.scale.set(scale * 1.35, scale * 1.7, scale * 1.35)
      object.updateMatrix()
      crown.setMatrixAt(index, object.matrix)

      object.position.set(x + 0.12 * scale, y + 4.45 * scale, z)
      object.scale.set(scale * 0.92, scale * 1.2, scale * 0.92)
      object.updateMatrix()
      crownTop.setMatrixAt(index, object.matrix)
    })

    for (const mesh of [trunk, crown, crownTop]) mesh.instanceMatrix.needsUpdate = true
  }, [])

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[undefined, undefined, treePlacements.length]} castShadow>
        <cylinderGeometry args={[0.16, 0.25, 2.25, 7]} />
        <meshStandardMaterial color="#5b4532" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crownRef} args={[undefined, undefined, treePlacements.length]} castShadow receiveShadow>
        <icosahedronGeometry args={[1.35, 1]} />
        <meshStandardMaterial color="#3f6f55" roughness={0.94} flatShading />
      </instancedMesh>
      <instancedMesh ref={crownTopRef} args={[undefined, undefined, treePlacements.length]} castShadow>
        <icosahedronGeometry args={[1.15, 1]} />
        <meshStandardMaterial color="#5b8261" roughness={0.95} flatShading />
      </instancedMesh>
    </group>
  )
}

const mountainData = [
  [-76, 12, -47, 16, 28], [-56, 15, -54, 20, 35], [-31, 13, -55, 17, 31],
  [-4, 16, -57, 22, 38], [25, 14, -54, 19, 34], [52, 16, -48, 23, 39],
  [78, 11, -35, 16, 29], [-88, 8, -17, 13, 22],
] as const

function Mountains() {
  return (
    <group>
      {mountainData.map(([x, y, z, radius, height], index) => (
        <group key={`${x}-${z}`}>
          <mesh position={[x, y, z]} scale={[1, 1, 0.82]} receiveShadow castShadow>
            <coneGeometry args={[radius, height, 7, 3]} />
            <meshStandardMaterial color={index % 2 ? '#4f6857' : '#607963'} roughness={1} flatShading />
          </mesh>
          <mesh position={[x + radius * 0.52, y * 0.62, z + 3]} scale={[0.7, 0.66, 0.8]} receiveShadow>
            <coneGeometry args={[radius, height, 7, 2]} />
            <meshStandardMaterial color="#465f52" roughness={1} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const lanternPoints = scenicGraph.edges
  .filter((edge) => edge.kind === 'path')
  .flatMap((edge) => edge.path.filter((_, index) => index % 2 === 0))
  .slice(0, 34)

function Lanterns({ lightLevel }: { lightLevel: number }) {
  const isLit = lightLevel > 0.08
  return (
    <group>
      {lanternPoints.map(([x, , z], index) => {
        const y = getTerrainHeight(x, z)
        return (
          <group key={`${x}-${z}-${index}`} position={[x + (index % 2 ? 1.85 : -1.85), y, z]}>
            <mesh position={[0, 1.25, 0]} castShadow>
              <cylinderGeometry args={[0.055, 0.08, 2.5, 7]} />
              <meshStandardMaterial color="#352c25" roughness={0.82} />
            </mesh>
            <mesh position={[0, 2.2, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.55, 8]} />
              <meshStandardMaterial
                color={isLit ? '#d78043' : '#8c392e'}
                emissive="#d86b2d"
                emissiveIntensity={0.08 + lightLevel * 1.15}
                roughness={0.68}
              />
            </mesh>
            {isLit && index % 7 === 0 ? (
              <pointLight position={[0, 2.2, 0]} color="#ffb66d" intensity={lightLevel * 2.4} distance={7} decay={2} />
            ) : null}
          </group>
        )
      })}
    </group>
  )
}

function DistantHeightHaze({ hour }: { hour: number }) {
  const atmosphere = useMemo(() => getAtmosphere(hour), [hour])
  return (
    <mesh position={[0, 12, -68]} renderOrder={-1}>
      <planeGeometry args={[210, 30]} />
      <meshLambertMaterial
        color={atmosphere.fog}
        transparent
        opacity={atmosphere.phase === 'day' ? 0.045 : atmosphere.phase === 'night' ? 0.028 : 0.055}
        depthWrite={false}
      />
    </mesh>
  )
}

function Lighting({ hour }: { hour: number }) {
  const atmosphere = useMemo(() => getAtmosphere(hour), [hour])
  useFrame(({ gl }) => {
    gl.toneMappingExposure = atmosphere.exposure
  })

  return (
    <>
      <color attach="background" args={[atmosphere.background]} />
      <fog attach="fog" args={[atmosphere.fog, atmosphere.fogNear, atmosphere.fogFar]} />
      <ambientLight intensity={atmosphere.ambientIntensity} color={atmosphere.ambient} />
      <hemisphereLight intensity={atmosphere.hemisphereIntensity} color={atmosphere.background} groundColor="#3f443a" />
      <directionalLight
        castShadow
        position={atmosphere.sunPosition}
        intensity={atmosphere.sunIntensity}
        color={atmosphere.sun}
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-camera-far={190}
        shadow-camera-left={-82}
        shadow-camera-right={82}
        shadow-camera-top={72}
        shadow-camera-bottom={-72}
        shadow-bias={-0.00015}
      />
      <AtmosphereSky hour={hour} />
      {atmosphere.starOpacity > 0.05 ? (
        <Stars radius={190} depth={50} count={1700} factor={3} saturation={0.15} fade speed={0.35} />
      ) : null}
      <Lanterns lightLevel={atmosphere.artificialLight} />
    </>
  )
}

export function ScenicEnvironment({ hour }: { hour: number }) {
  return (
    <>
      <Lighting hour={hour} />
      <Terrain />
      <DynamicWater hour={hour} />
      <DistantHeightHaze hour={hour} />
      <ScenicRoads />
      <Mountains />
      <TreeInstances />
      <Line points={[[-88, 0.2, 58], [88, 0.2, 58]]} color="#8c7655" lineWidth={0.7} transparent opacity={0.28} />
    </>
  )
}
