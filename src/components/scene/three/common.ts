import * as THREE from 'three'

/** 天气画卷 3D 部分的公共工具：渲染器、帧循环、纹理与低多边形部件 */

export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/** 手机或低功耗设备：降低像素比、关闭阴影、限制帧率 */
export function isLowPower(): boolean {
  const narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 720px)').matches
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? 8 : 8
  return narrow || cores <= 4
}

export function createRenderer(canvas: HTMLCanvasElement, lowPower: boolean, toneMapping: THREE.ToneMapping = THREE.ACESFilmicToneMapping): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power', preserveDrawingBuffer: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = toneMapping
  renderer.toneMappingExposure = 1.05
  return renderer
}

export interface FrameLoop {
  start(): void
  stop(): void
  /** 不在动画中时也补画一帧（如天气变化、减少动态效果时） */
  renderOnce(): void
}

/** rAF 帧循环：限制最高帧率；页面隐藏时浏览器自动暂停 rAF */
export function createLoop(frame: (time: number, dt: number) => void, maxFps: number): FrameLoop {
  let handle = 0
  let last = 0
  let time = 0
  const minStep = 1000 / maxFps - 1
  const tick = (now: number) => {
    handle = requestAnimationFrame(tick)
    if (last && now - last < minStep) return
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / maxFps
    last = now
    time += dt
    frame(time, dt)
  }
  return {
    start() { if (!handle) { last = 0; handle = requestAnimationFrame(tick) } },
    stop() { cancelAnimationFrame(handle); handle = 0 },
    renderOnce() { frame(time, 0) },
  }
}

/** 径向渐变贴图：用于太阳光晕、萤火虫、烟雾与雪花 */
export function radialTexture(stops: [number, string][], size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [offset, color] of stops) gradient.addColorStop(offset, color)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** 横向渐隐的条纹贴图：风线、流星尾迹 */
export function streakTexture(width = 256, height = 16): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createLinearGradient(0, 0, width, 0)
  gradient.addColorStop(0, 'rgba(255,255,255,0)')
  gradient.addColorStop(0.75, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(1, 'rgba(255,255,255,1)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, height / 2 - height / 4, width, height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export interface Kit {
  /** 低多边形风格的哑光材质（同色共享） */
  matte(color: THREE.ColorRepresentation, options?: { flat?: boolean; side?: THREE.Side }): THREE.MeshLambertMaterial
  /** 椭球部件：低多边形球体按三轴缩放 */
  blob(radii: [number, number, number], color: THREE.ColorRepresentation, at?: [number, number, number], detail?: [number, number]): THREE.Mesh
  box(size: [number, number, number], color: THREE.ColorRepresentation, at?: [number, number, number]): THREE.Mesh
  dispose(): void
}

/** 每个 3D 场景各自一套材质缓存，销毁时互不影响 */
export function createKit(): Kit {
  const cache = new Map<string, THREE.MeshLambertMaterial>()
  const matte: Kit['matte'] = (color, options = {}) => {
    const key = `${new THREE.Color(color).getHexString()}|${options.flat ?? true}|${options.side ?? 0}`
    let material = cache.get(key)
    if (!material) {
      material = new THREE.MeshLambertMaterial({ color, flatShading: options.flat ?? true, side: options.side ?? THREE.FrontSide })
      cache.set(key, material)
    }
    return material
  }
  return {
    matte,
    blob(radii, color, at = [0, 0, 0], detail = [8, 6]) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, detail[0], detail[1]), matte(color))
      mesh.scale.set(...radii)
      mesh.position.set(...at)
      mesh.castShadow = true
      return mesh
    },
    box(size, color, at = [0, 0, 0]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), matte(color))
      mesh.position.set(...at)
      mesh.castShadow = true
      mesh.receiveShadow = true
      return mesh
    },
    dispose() {
      for (const material of cache.values()) material.dispose()
      cache.clear()
    },
  }
}

/** 给几何体顶点加一点随机起伏，让低多边形更自然 */
export function jitter<T extends THREE.BufferGeometry>(geometry: T, amount: number, seed: number): T {
  const rand = seeded(seed)
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  const seen = new Map<string, [number, number, number]>()
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`
    let offset = seen.get(key)
    if (!offset) { offset = [(rand() - 0.5) * amount, (rand() - 0.5) * amount, (rand() - 0.5) * amount]; seen.set(key, offset) }
    pos.setXYZ(i, pos.getX(i) + offset[0], pos.getY(i) + offset[1], pos.getZ(i) + offset[2])
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

/** 释放场景里所有几何体、材质与贴图 */
export function disposeTree(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>()
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh
    mesh.geometry?.dispose()
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined
    for (const m of Array.isArray(material) ? material : material ? [material] : []) materials.add(m)
  })
  for (const m of materials) { (m as THREE.MeshBasicMaterial).map?.dispose(); m.dispose() }
}

/** 读取页面背景色（雾色与之一致，远景自然融进页面） */
export function pageBackground(): THREE.Color {
  const value = getComputedStyle(document.body).backgroundColor || 'rgb(242,244,247)'
  const match = value.match(/\d+(\.\d+)?/g)
  if (!match || match.length < 3) return new THREE.Color(0xf2f4f7)
  return new THREE.Color(`rgb(${Math.round(+match[0]!)}, ${Math.round(+match[1]!)}, ${Math.round(+match[2]!)})`)
}
