import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import type { SceneEvent, SceneState } from '../../../services/scene'
import { sunAboveHorizon } from '../../../services/scene'
import { createLoop, createRenderer, disposeTree, isLowPower, jitter, radialTexture, seeded, streakTexture } from './common'
import { CLOUD_PLAN, lighting } from './environment'
import moonSurfaceUrl from '../../../assets/moon-lroc-1k.jpg'

export interface SkyWorld {
  setState(state: SceneState, dark: boolean): void
  /** 画布尺寸与太阳/月亮在画布上的像素位置 */
  setLayout(width: number, height: number, body: { x: number; y: number; r: number }): void
  setActive(active: boolean): void
  setReducedMotion(reduced: boolean): void
  fire(event: SceneEvent): void
  dispose(): void
}

const CAMERA_Z = 20
const FOV = 40
const SUN_DEPTH = -40

/** 一朵积云：若干个圆润的球体拼成，中间高、两头低，底部压平；顶点焊接后平滑着色，看起来是蓬松的一团 */
function cloudGeometry(seed: number): THREE.BufferGeometry {
  const rand = seeded(seed)
  const parts: THREE.BufferGeometry[] = []
  const n = 7 + Math.floor(rand() * 4)
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1) - 0.5) * 4.6 + (rand() - 0.5) * 0.5
    const r = (0.7 + rand() * 0.55) * (1.25 - Math.abs(x) * 0.12)
    const g = new THREE.IcosahedronGeometry(r, 3)
    const y = Math.max(0, 0.9 - Math.abs(x) * 0.32) * (0.7 + rand() * 0.6)
    g.translate(x, y, (rand() - 0.5) * 1.1)
    g.deleteAttribute('uv')
    g.deleteAttribute('normal')
    parts.push(g)
  }
  const merged = mergeGeometries(parts)!
  parts.forEach(p => p.dispose())
  const pos = merged.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) if (pos.getY(i) < -0.2) pos.setY(i, -0.2 + (pos.getY(i) + 0.2) * 0.12)
  return jitter(mergeVertices(merged), 0.06, seed)
}

/** 月相使用观察空间光照，背光面只保留微弱地照，不叠出一整块灰色圆盘。 */
function moonMaterial(surface: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uLight: { value: new THREE.Vector3(1, 0, 0) }, uOpacity: { value: 1 }, uTint: { value: new THREE.Color(0xfff8ed) }, uSurface: { value: surface }, uMapReady: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec2 vUv;
      void main() {
        // 月球局部正面始终朝向相机，月相不受其在画面中的偏心位置影响。
        vNormal = normal;
        vUv = vec2(fract(uv.x + 0.25), uv.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uLight;
      uniform float uOpacity;
      uniform vec3 uTint;
      varying vec3 vNormal;
      uniform sampler2D uSurface;
      uniform float uMapReady;
      varying vec2 vUv;
      void main() {
        float lit = dot(normalize(vNormal), normalize(uLight));
        float day = smoothstep(-0.015, 0.035, lit);
        vec3 surface = mix(vec3(0.72), texture2D(uSurface, vUv).rgb * 1.5, uMapReady);
        vec3 col = surface * uTint * (0.65 + 0.35 * sqrt(max(lit, 0.0)));
        gl_FragColor = vec4(col, mix(0.006, 1.0, day) * uOpacity);
        #include <colorspace_fragment>
      }`,
  })
}

export function createSkyWorld(canvas: HTMLCanvasElement): SkyWorld {
  let disposed = false
  const lowPower = isLowPower()
  const renderer = createRenderer(canvas, lowPower, THREE.NoToneMapping)
  renderer.autoClear = false
  const scene = new THREE.Scene()
  const moonScene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, 4, 0.1, 400)
  camera.position.set(0, 0, CAMERA_Z)
  camera.lookAt(0, 0, 0)

  const hemi = new THREE.HemisphereLight(0xffffff, 0xd8dee6, 1.6)
  const sunLight = new THREE.DirectionalLight(0xfff3e2, 2.2)
  scene.add(hemi, sunLight, sunLight.target)

  /* —— 太阳 —— */
  const sunGroup = new THREE.Group()
  const sunCore = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true }))
  const glowTexture = radialTexture([[0, 'rgba(255,225,150,0.95)'], [0.18, 'rgba(255,214,130,0.55)'], [0.45, 'rgba(255,205,120,0.18)'], [1, 'rgba(255,200,110,0)']])
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, transparent: true, depthWrite: false }))
  sunGroup.add(sunGlow, sunCore)
  scene.add(sunGroup)

  /* —— 月亮（单独场景，由月相角度的平行光照亮） —— */
  const moonSurface = new THREE.TextureLoader().load(moonSurfaceUrl, () => {
    if (disposed) return
    moonShader.uniforms.uMapReady!.value = 1
    loop.renderOnce()
  })
  moonSurface.colorSpace = THREE.SRGBColorSpace
  const moonShader = moonMaterial(moonSurface)
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), moonShader)
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture([[0, 'rgba(225,232,255,0.5)'], [0.4, 'rgba(210,220,255,0.15)'], [1, 'rgba(200,210,255,0)']]), transparent: true, depthWrite: false }))
  moonScene.add(moonGlow, moon)

  /* —— 星星 —— */
  const starRand = seeded(97)
  let starOpacity = 0.14
  const starSets = [0, 1].map(k => {
    const count = lowPower ? (k ? 6 : 10) : (k ? 12 : 20)
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (starRand() - 0.5) * 160
      positions[i * 3 + 1] = (starRand() - 0.1) * 40
      positions[i * 3 + 2] = -60
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const points = new THREE.Points(g, new THREE.PointsMaterial({
      map: radialTexture([[0, 'rgba(255,255,255,0.95)'], [0.18, 'rgba(255,255,255,0.65)'], [0.45, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']], 32),
      color: 0xfffbf3,
      size: k ? 4.5 : 3,
      sizeAttenuation: false,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: starOpacity,
      depthWrite: false,
    }))
    points.renderOrder = -1
    moonScene.add(points)
    return points
  })

  /* —— 云 —— */
  const cloudPool = Array.from({ length: 12 }, (_, i) => {
    const mesh = new THREE.Mesh(cloudGeometry(i * 13 + 5), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, depthWrite: true, flatShading: false }))
    mesh.visible = false
    scene.add(mesh)
    mesh.geometry.computeBoundingSphere()
    const bounds = mesh.geometry.boundingSphere!
    return { mesh, speed: 0, depth: 0, scale: 1, radius: bounds.radius + bounds.center.length() }
  })

  /* —— 雨 —— */
  const RAIN_MAX = lowPower ? 420 : 760
  const rainPositions = new Float32Array(RAIN_MAX * 6)
  const rainGeometry = new THREE.BufferGeometry()
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3))
  const rainMaterial = new THREE.LineBasicMaterial({ color: 0x8fa3ba, transparent: true, opacity: 0.55, depthWrite: false })
  const rain = new THREE.LineSegments(rainGeometry, rainMaterial)
  rain.frustumCulled = false
  scene.add(rain)
  const rainDrops = Array.from({ length: RAIN_MAX }, () => ({ x: 0, y: 0, z: 0, speed: 1 }))

  /* —— 雪 —— */
  const SNOW_MAX = lowPower ? 260 : 520
  const snowPositions = new Float32Array(SNOW_MAX * 3)
  const snowGeometry = new THREE.BufferGeometry()
  snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3))
  const snowMaterial = new THREE.PointsMaterial({ map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']], 32), size: 0.26, transparent: true, depthWrite: false, color: 0xffffff })
  const snow = new THREE.Points(snowGeometry, snowMaterial)
  snow.frustumCulled = false
  scene.add(snow)
  const flakes = Array.from({ length: SNOW_MAX }, () => ({ x: 0, y: 0, z: 0, speed: 1, phase: 0 }))

  /* —— 风线、雾带、流星、闪电 —— */
  const streak = streakTexture()
  const windLines = Array.from({ length: 6 }, () => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.07), new THREE.MeshBasicMaterial({ map: streak, transparent: true, opacity: 0, depthWrite: false, color: 0x9fb2c4 }))
    scene.add(mesh)
    return { mesh, speed: 0, life: 0 }
  })
  const fogTexture = radialTexture([[0, 'rgba(235,239,243,0.85)'], [0.6, 'rgba(230,235,240,0.35)'], [1, 'rgba(225,230,236,0)']])
  const fogBanks = Array.from({ length: 5 }, () => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTexture, transparent: true, opacity: 0, depthWrite: false }))
    scene.add(sprite)
    return { sprite, speed: 0 }
  })
  const meteor = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.06), new THREE.MeshBasicMaterial({ map: streak, transparent: true, opacity: 0, depthWrite: false }))
  moonScene.add(meteor)
  let meteorT = -1
  const boltMaterial = new THREE.MeshBasicMaterial({ color: 0xfffbe6, transparent: true, opacity: 0, depthWrite: false })
  let bolt: THREE.Mesh | null = null
  let lightningT = -1

  let width = 1
  let height = 1
  let current: SceneState | null = null
  let reduced = false
  let active = false
  let rainCount = 0
  let rainLength = 0.4
  let rainSpeed = 12
  let snowCount = 0
  let windSpeed = 0
  let hemiBase = 1.6
  let cloudBaseColor = new THREE.Color(0xffffff)
  let cloudFill = 0.42
  const body = { x: 0, y: 0, r: 20 }

  /** 某一深度上可见区域的半宽、半高 */
  const halfAt = (z: number) => {
    const h = (CAMERA_Z - z) * Math.tan(((FOV / 2) * Math.PI) / 180)
    return { w: h * camera.aspect, h }
  }
  /** 画布像素 → 某一深度平面上的世界坐标 */
  const pxToWorld = (x: number, y: number, z: number) => {
    const v = new THREE.Vector3((x / width) * 2 - 1, -(y / height) * 2 + 1, 0.5).unproject(camera)
    const dir = v.sub(camera.position).normalize()
    const t = (z - camera.position.z) / dir.z
    return camera.position.clone().addScaledVector(dir, t)
  }

  function placeBodies() {
    const p = pxToWorld(body.x, body.y, SUN_DEPTH)
    const worldPerPx = (halfAt(SUN_DEPTH).h * 2) / height
    const r = body.r * worldPerPx
    sunGroup.position.copy(p)
    sunCore.scale.setScalar(r)
    sunGlow.scale.setScalar(r * 7.5)
    moon.position.copy(p)
    moon.lookAt(camera.position)
    moon.scale.setScalar(r * 0.85)
    moonGlow.position.copy(p)
    moonGlow.scale.setScalar(r * 5)
    sunLight.position.copy(p).add(new THREE.Vector3(0, 0, 50))
    sunLight.target.position.set(0, 0, -10)
  }

  function layoutClouds(state: SceneState, aspectRatio = 1) {
    const plan = CLOUD_PLAN[state.sky]
    const rand = seeded(plan.count * 31 + (state.sky.length * 7))
    const count = Math.min(cloudPool.length, Math.max(1, Math.round(plan.count * (width < 600 ? 0.6 : 1))))
    cloudPool.forEach((cloud, i) => {
      const wasVisible = cloud.mesh.visible
      cloud.mesh.visible = i < count
      if (i >= count) return
      cloud.depth = -2 - rand() * 18
      const half = halfAt(cloud.depth)
      cloud.scale = (plan.scale[0] + rand() * (plan.scale[1] - plan.scale[0])) * (width < 600 ? 0.85 : 1.25)
      cloud.mesh.scale.set(cloud.scale, cloud.scale * 0.85, cloud.scale)
      const frac = plan.band[0] + rand() * (plan.band[1] - plan.band[0])
      const initialX = (rand() * 2 - 1) * half.w
      if (wasVisible) cloud.mesh.position.x *= aspectRatio
      else cloud.mesh.position.set(initialX, -half.h + frac * 2 * half.h, cloud.depth)
      cloud.mesh.position.z = cloud.depth
      cloud.speed = (0.18 + rand() * 0.2) * (1 - cloud.depth / 60)
      const material = cloud.mesh.material as THREE.MeshLambertMaterial
      material.opacity = plan.opacity
    })
  }

  function seedPrecipitation() {
    for (const drop of rainDrops) {
      drop.z = -14 + Math.random() * 18
      const half = halfAt(drop.z)
      drop.x = (Math.random() * 2 - 1) * half.w
      drop.y = (Math.random() * 2 - 1) * half.h
      drop.speed = 0.8 + Math.random() * 0.4
    }
    for (const flake of flakes) {
      flake.z = -14 + Math.random() * 18
      const half = halfAt(flake.z)
      flake.x = (Math.random() * 2 - 1) * half.w
      flake.y = (Math.random() * 2 - 1) * half.h
      flake.speed = 0.6 + Math.random() * 0.8
      flake.phase = Math.random() * 10
    }
  }

  function applyState(state: SceneState, isDark: boolean) {
    const skyChanged = !current || current.sky !== state.sky
    current = state
    const night = state.phase === 'night'
    const sky = state.sky
    const light = lighting(state, isDark)

    // 太阳：晴天明亮、多云半遮、阴雾朦胧；雨雪天藏在云后
    const sunMode = !sunAboveHorizon(state) ? 'none' : sky === 'clear' || sky === 'partly' ? 'bright' : sky === 'overcast' || sky === 'fog' || sky === 'snow' ? 'hazy' : 'none'
    sunGroup.visible = sunMode !== 'none'
    const warm = state.phase === 'dawn' || state.phase === 'dusk'
    ;(sunCore.material as THREE.MeshBasicMaterial).color.setHex(warm ? 0xffb27a : 0xffe2a0)
    ;(sunCore.material as THREE.MeshBasicMaterial).opacity = sunMode === 'hazy' ? 0.55 : 1
    ;(sunGlow.material as THREE.SpriteMaterial).opacity = sunMode === 'hazy' ? 0.35 : isDark ? 0.6 : 0.95
    ;(sunGlow.material as THREE.SpriteMaterial).color.setHex(warm ? 0xffc39a : 0xffffff)

    // 月亮：按月相角度从侧后方照亮，亮面形状即真实月相
    const moonVisible = night && sky !== 'rain' && sky !== 'storm' && sky !== 'drizzle'
    moon.visible = moonGlow.visible = moonVisible
    // 光源方向：朔（0）在月球背后，上弦（0.25）在右，望（0.5）在正前方，下弦（0.75）在左
    const a = state.moon * Math.PI * 2
    moonShader.uniforms.uLight!.value.set(Math.sin(a), 0, -Math.cos(a))
    const illuminated = (1 - Math.cos(a)) / 2
    ;(moonGlow.material as THREE.SpriteMaterial).opacity = moonVisible ? illuminated * (sky === 'clear' || sky === 'partly' ? 0.28 : 0.12) : 0
    moonShader.uniforms.uOpacity!.value = sky === 'clear' || sky === 'partly' ? 1 : 0.5
    ;(moonShader.uniforms.uTint!.value as THREE.Color).setHex(0xfff8ed)
    starOpacity = isDark ? 0.5 : 0.14
    starSets.forEach(points => { points.visible = night && (sky === 'clear' || sky === 'partly') })
    starSets.forEach(points => { points.material.opacity = starOpacity })

    // 光照：云的明暗跟着太阳/月光走
    sunLight.color.setHex(light.sunColor)
    sunLight.intensity = night ? 0.7 : Math.max(0.6, light.sunIntensity)
    hemi.color.setHex(night ? 0x5a6788 : 0xffffff)
    hemi.groundColor.setHex(night ? 0x1f2533 : 0xc9d2dc)
    hemiBase = (night ? 0.9 : 1.7) * (isDark ? 0.75 : 1)
    hemi.intensity = hemiBase

    // 夜间保留柔和的银白云层；阴影由补光托起，避免主题与月光重复压暗。
    const plan = CLOUD_PLAN[sky]
    cloudBaseColor = new THREE.Color(plan.shade)
    if (night) cloudBaseColor.lerp(new THREE.Color(0xdce5f3), 0.25)
    cloudBaseColor.multiplyScalar(isDark ? 0.7 : night ? 0.9 : 1)
    cloudFill = night ? (isDark ? 0.6 : 0.78) : isDark ? 0.5 : 0.42
    cloudPool.forEach(cloud => {
      const material = cloud.mesh.material as THREE.MeshLambertMaterial
      material.color.copy(cloudBaseColor)
      material.emissive.copy(cloudBaseColor).multiplyScalar(cloudFill)
    })
    if (skyChanged || !cloudPool.some(c => c.mesh.visible)) layoutClouds(state)

    // 降水
    const frozenPrecip = sky === 'snow'
    rainCount = frozenPrecip ? 0 : sky === 'drizzle' ? Math.round(RAIN_MAX * 0.35) : sky === 'rain' ? Math.round(RAIN_MAX * 0.7) : sky === 'storm' ? RAIN_MAX : 0
    rainLength = sky === 'drizzle' ? 0.28 : sky === 'storm' ? 0.65 : 0.45
    rainSpeed = sky === 'drizzle' ? 7 : sky === 'storm' ? 17 : 12
    rainMaterial.color.setHex(isDark ? 0xaabbd2 : 0x7f93ab)
    rainMaterial.opacity = sky === 'drizzle' ? 0.4 : 0.6
    snowCount = frozenPrecip ? SNOW_MAX : 0
    snowMaterial.color.setHex(isDark ? 0xe6ecf5 : 0xc3cfdf)
    windSpeed = state.wind
    fogBanks.forEach((bank, i) => {
      const material = bank.sprite.material as THREE.SpriteMaterial
      material.opacity = sky === 'fog' ? 0.55 : 0
      material.color.setHex(isDark ? 0x5a6270 : 0xffffff)
      const z = -6 - i * 4
      const half = halfAt(z)
      bank.sprite.position.set((i / 4 - 0.5) * half.w * 1.6, -half.h * (0.1 + (i % 3) * 0.25), z)
      bank.sprite.scale.set(half.w * 0.9, half.h * 0.55, 1)
      bank.speed = 0.15 + i * 0.05
    })
    if (skyChanged) seedPrecipitation()
    if (reduced || !active) loop.renderOnce()
  }

  function strikeLightning() {
    if (bolt) { scene.remove(bolt); bolt.geometry.dispose() }
    const half = halfAt(-8)
    const x0 = (Math.random() * 1.4 - 0.7) * half.w
    const points: THREE.Vector3[] = [new THREE.Vector3(x0, half.h * 0.55, -8)]
    let p = points[0]!.clone()
    while (p.y > -half.h - 1) {
      p = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.1, -(0.5 + Math.random() * 0.7), 0))
      points.push(p)
    }
    const path = new THREE.CurvePath<THREE.Vector3>()
    for (let i = 0; i < points.length - 1; i++) path.add(new THREE.LineCurve3(points[i]!, points[i + 1]!))
    const branchFrom = points[Math.floor(points.length / 3)]!
    const branchTo = branchFrom.clone().add(new THREE.Vector3(1.6 * Math.sign(Math.random() - 0.5), -1.8, 0))
    const geometry = mergeGeometries([
      new THREE.TubeGeometry(path, points.length * 2, 0.06, 4, false),
      new THREE.TubeGeometry(new THREE.LineCurve3(branchFrom, branchTo), 2, 0.035, 4, false),
    ])!
    bolt = new THREE.Mesh(geometry, boltMaterial)
    scene.add(bolt)
    lightningT = 0
  }

  function frame(time: number, dt: number) {
    if (dt > 0 && current) {
      const windFactor = [1, 1.8, 3][windSpeed]!
      // 云：按各自深度平移，越近越快（视差），出界后从另一侧回来
      for (const cloud of cloudPool) {
        if (!cloud.mesh.visible) continue
        cloud.mesh.position.x += cloud.speed * windFactor * dt
        // 球形包围体包含整朵云及其旋转；在最远深度也完全离开视锥后才循环。
        const radius = cloud.radius * cloud.scale
        const edge = halfAt(cloud.depth - radius).w + radius
        if (cloud.mesh.position.x > edge) cloud.mesh.position.x -= edge * 2
        cloud.mesh.rotation.y = Math.sin(time * 0.05 + cloud.depth) * 0.08
      }
      // 太阳呼吸
      const breath = 1 + Math.sin(time * 0.4) * 0.05
      sunGlow.scale.setScalar(sunCore.scale.x * 7.5 * breath)
      starSets.forEach((points, i) => { points.material.opacity = starOpacity * (0.88 + Math.sin(time * 0.45 + i * 2) * 0.12) })
      // 雨：斜着落下，落到底部后回到顶部
      const slant = 0.12 + windSpeed * 0.18
      for (let i = 0; i < RAIN_MAX; i++) {
        const drop = rainDrops[i]!
        const o = i * 6
        if (i >= rainCount) { rainPositions.fill(0, o, o + 6); continue }
        const half = halfAt(drop.z)
        drop.y -= rainSpeed * drop.speed * dt
        drop.x += rainSpeed * drop.speed * slant * dt
        if (drop.y < -half.h - 1) { drop.y = half.h + Math.random() * 2; drop.x = (Math.random() * 2 - 1) * half.w }
        if (drop.x > half.w) drop.x -= half.w * 2
        rainPositions[o] = drop.x
        rainPositions[o + 1] = drop.y
        rainPositions[o + 2] = drop.z
        rainPositions[o + 3] = drop.x - rainLength * slant
        rainPositions[o + 4] = drop.y + rainLength
        rainPositions[o + 5] = drop.z
      }
      rainGeometry.attributes.position!.needsUpdate = true
      rain.visible = rainCount > 0
      // 雪：缓缓飘落、左右摇摆
      for (let i = 0; i < SNOW_MAX; i++) {
        const flake = flakes[i]!
        const o = i * 3
        if (i >= snowCount) { snowPositions[o + 1] = -999; continue }
        const half = halfAt(flake.z)
        flake.y -= flake.speed * dt
        flake.x += (Math.sin(time * 0.8 + flake.phase) * 0.3 + windSpeed * 0.4) * dt
        if (flake.y < -half.h - 0.5) { flake.y = half.h + 0.5; flake.x = (Math.random() * 2 - 1) * half.w }
        if (flake.x > half.w) flake.x -= half.w * 2
        snowPositions[o] = flake.x
        snowPositions[o + 1] = flake.y
        snowPositions[o + 2] = flake.z
      }
      snowGeometry.attributes.position!.needsUpdate = true
      snow.visible = snowCount > 0
      // 风线
      windLines.forEach((line, i) => {
        const material = line.mesh.material as THREE.MeshBasicMaterial
        if (windSpeed === 0 && line.life <= 0) { material.opacity = 0; return }
        line.life -= dt
        if (line.life <= 0 && windSpeed > 0 && i < windSpeed * 3) {
          const z = -2 - Math.random() * 12
          const half = halfAt(z)
          line.mesh.position.set(-half.w - 3, (Math.random() * 1.4 - 0.5) * half.h, z)
          line.speed = (6 + Math.random() * 4) * (windSpeed === 2 ? 1.6 : 1)
          line.life = (half.w * 2 + 6) / line.speed
        }
        line.mesh.position.x += line.speed * dt
        material.opacity = line.life > 0 ? Math.min(0.55, line.life * 0.6) : 0
      })
      fogBanks.forEach(bank => { bank.sprite.position.x += Math.sin(time * 0.1) * bank.speed * dt })
      // 闪电：两次明暗闪烁，同时照亮云层
      if (lightningT >= 0) {
        lightningT += dt
        const u = lightningT / 0.9
        const flash = u < 0.08 ? 1 : u < 0.2 ? 0.15 : u < 0.32 ? 0.8 : Math.max(0, 1 - (u - 0.32) * 1.6)
        boltMaterial.opacity = u < 0.45 ? flash : 0
        hemi.intensity = hemiBase + flash * 3
        cloudPool.forEach(cloud => { (cloud.mesh.material as THREE.MeshLambertMaterial).emissive.copy(cloudBaseColor).multiplyScalar(cloudFill + flash * 0.6) })
        if (u >= 1) {
          lightningT = -1
          hemi.intensity = hemiBase
          if (bolt) { scene.remove(bolt); bolt.geometry.dispose(); bolt = null }
        }
      }
      // 流星
      if (meteorT >= 0) {
        meteorT += dt
        const u = meteorT / 1.3
        const material = meteor.material as THREE.MeshBasicMaterial
        material.opacity = Math.sin(Math.min(1, u) * Math.PI)
        meteor.position.x -= 9 * dt
        meteor.position.y -= 3.6 * dt
        if (u >= 1) { meteorT = -1; material.opacity = 0 }
      }
    }
    renderer.clear()
    renderer.render(moonScene, camera)
    renderer.render(scene, camera)
  }
  const loop = createLoop(frame, lowPower ? 30 : 60)

  return {
    setState: applyState,
    setLayout(w, h, next) {
      if (w < 2 || h < 2) return
      const resized = width !== w || height !== h
      const previousAspect = camera.aspect
      width = w
      height = h
      if (resized) {
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      Object.assign(body, next)
      placeBodies()
      if (current && resized) { layoutClouds(current, camera.aspect / previousAspect); seedPrecipitation() }
      loop.renderOnce()
    },
    setActive(next) {
      active = next
      if (next && !reduced) loop.start()
      else { loop.stop(); loop.renderOnce() }
    },
    setReducedMotion(next) {
      reduced = next
      if (reduced) { loop.stop(); loop.renderOnce() }
      else if (active) loop.start()
    },
    fire(event) {
      if (reduced || !current) return
      if (event === 'lightning') strikeLightning()
      if (event === 'meteor') {
        const half = halfAt(-30)
        meteor.position.set((0.2 + Math.random() * 0.6) * half.w, half.h * (0.4 + Math.random() * 0.4), -30)
        meteor.rotation.z = Math.atan2(-3.6, -9)
        meteorT = 0
      }
    },
    dispose() {
      disposed = true
      loop.stop()
      moonSurface.dispose()
      if (bolt) bolt.geometry.dispose()
      disposeTree(scene)
      disposeTree(moonScene)
      boltMaterial.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
