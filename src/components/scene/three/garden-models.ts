import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { type Kit, jitter, seeded, smoothstep, lerp } from './common'
import type { GardenPalette } from './environment'

/** 花园布局（世界坐标，单位约等于米；相机朝 -z 看，左西右东） */
/** 小河：从远山脚下蜿蜒流向近处，越近越宽（中心线控制点，从远到近） */
const RIVER_POINTS: [number, number][] = [[-17, -78], [-10, -56], [-16, -38], [-8, -24], [-12, -13], [-5, -4], [-8, 5], [-4, 16]]
const RIVER_CURVE = new THREE.CatmullRomCurve3(RIVER_POINTS.map(([x, z]) => new THREE.Vector3(x, 0, z)))
const RIVER_SAMPLES = RIVER_CURVE.getSpacedPoints(240)
/** 河面半宽：上游 0.5、下游 2.1 */
export const riverHalfWidth = (t: number) => lerp(0.5, 2.1, t * t * 0.6 + t * 0.4)
export const CABIN = { x: 4.8, z: -8.5, yaw: -0.5 }
export const TREE = { x: 11, z: -1.2, height: 3.2, rBase: 0.42, rTop: 0.28 }
export const TREE2 = { x: 17.5, z: -10, scale: 0.72 }
export const PINES = [
  { x: -19, z: -3, s: 1.1 },
  { x: -23.5, z: -7.5, s: 1.3 },
  { x: -15.5, z: -11, s: 0.85 },
  { x: 21.5, z: -4.5, s: 1.0 },
  { x: -28.5, z: -2, s: 0.95 },
  { x: 26, z: -12, s: 1.2 },
]
export const FENCE = { from: [0.6, -4.2] as const, to: [7.2, -3.4] as const }

/** 水面上一点：到河中心线的距离除以（半宽 + pad），<1 即在河里；t 为沿河参数（0 远 → 1 近） */
export function riverInfo(x: number, z: number, pad = 0): { d: number; t: number } {
  let best = Infinity
  let bestI = 0
  for (let i = 0; i < RIVER_SAMPLES.length; i++) {
    const p = RIVER_SAMPLES[i]!
    const dd = (p.x - x) ** 2 + (p.z - z) ** 2
    if (dd < best) { best = dd; bestI = i }
  }
  const t = bestI / (RIVER_SAMPLES.length - 1)
  return { d: Math.sqrt(best) / (riverHalfWidth(t) + pad), t }
}
export function lakeDistance(x: number, z: number, pad = 0): number {
  return riverInfo(x, z, pad).d
}

/** 河上一点：沿河参数 t，横向偏移 offset（-1 一岸 … 1 另一岸，按半宽计） */
export function riverPoint(t: number, offset = 0, y = 0.05): THREE.Vector3 {
  const tt = Math.min(1, Math.max(0, t))
  const p = RIVER_CURVE.getPointAt(tt)
  const tangent = RIVER_CURVE.getTangentAt(tt)
  const normal = new THREE.Vector3(-tangent.z, 0, tangent.x)
  return p.addScaledVector(normal, offset * riverHalfWidth(tt)).setY(y)
}
/** 顺流方向（水平单位向量） */
export function riverFlow(t: number): THREE.Vector3 {
  return RIVER_CURVE.getTangentAt(Math.min(1, Math.max(0, t))).setY(0).normalize()
}

const PADS: { x: number; z: number; r: number }[] = [
  { x: CABIN.x, z: CABIN.z, r: 4.2 },
  { x: TREE.x, z: TREE.z, r: 1.6 },
]

/** 地面高度：缓坡起伏、越往后越高；湖底下凹，小屋与大树处放平 */
export function groundHeight(x: number, z: number): number {
  let h = 0.32 * Math.sin(x * 0.13 + 0.6) * Math.cos(z * 0.17) + 0.22 * Math.sin(x * 0.31 + z * 0.23)
  h += Math.max(0, -z - 18) * 0.07
  for (const pad of PADS) {
    const d = Math.hypot(x - pad.x, z - pad.z)
    h = lerp(0.05, h, smoothstep(pad.r * 0.6, pad.r, d))
  }
  const ld = lakeDistance(x, z, 1.2)
  if (ld < 1) h = lerp(-0.35, h, smoothstep(0.55, 1, ld))
  return h
}

export interface Ground { mesh: THREE.Mesh; recolor(palette: GardenPalette, wet: boolean): void }

export function makeGround(lowPower: boolean): Ground {
  const geometry = new THREE.PlaneGeometry(220, 96, lowPower ? 90 : 140, lowPower ? 40 : 60)
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, 0, -34)
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)))
  geometry.computeVertexNormals()
  const colors = new Float32Array(pos.count * 3)
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  const rand = seeded(11)
  const noise = Array.from({ length: pos.count }, () => rand())
  const a = new THREE.Color()
  const b = new THREE.Color()
  const c = new THREE.Color()
  return {
    mesh,
    recolor(palette, wet) {
      a.setHex(palette.ground)
      b.setHex(palette.groundAlt)
      const shore = new THREE.Color(palette.shore)
      for (let i = 0; i < pos.count; i++) {
        c.copy(a).lerp(b, noise[i]!)
        const ld = lakeDistance(pos.getX(i), pos.getZ(i), 1.4)
        if (ld < 1.08) c.lerp(shore, smoothstep(1.08, 0.8, ld) * 0.85)
        if (wet) c.multiplyScalar(0.86)
        colors[i * 3] = c.r
        colors[i * 3 + 1] = c.g
        colors[i * 3 + 2] = c.b
      }
      ;(geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true
    },
  }
}

export interface Range { mesh: THREE.Mesh; recolor(color: number, snowLine: number): void }

/** 远山：三排顶点（山脚、山腰、山脊）三角化成低多边形山脉，山顶按积雪线染白 */
export function makeRange(z: number, peak: number, seed: number, spread = 7): Range {
  const rand = seeded(seed)
  const xs: number[] = []
  for (let x = -190; x <= 190; x += spread + rand() * spread * 0.6) xs.push(x)
  const heights = xs.map((x, i) => peak * (0.45 + 0.55 * Math.abs(Math.sin(x * 0.021 + seed) * Math.cos(x * 0.009 + i * 0.3))) * (0.75 + rand() * 0.4))
  const vertices: number[] = []
  const tops: number[] = []
  const push = (x: number, y: number, zz: number, top: number) => { vertices.push(x, y, zz); tops.push(top) }
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[i]!
    const x1 = xs[i + 1]!
    const h0 = heights[i]!
    const h1 = heights[i + 1]!
    const m0 = h0 * 0.55
    const m1 = h1 * 0.55
    const zb = z
    const zm = z - 4
    const zt = z - 7
    // 山脚 → 山腰
    push(x0, -2, zb, 0); push(x1, -2, zb, 0); push(x1 + 1, m1, zm, m1 / peak)
    push(x0, -2, zb, 0); push(x1 + 1, m1, zm, m1 / peak); push(x0 + 1, m0, zm, m0 / peak)
    // 山腰 → 山脊
    push(x0 + 1, m0, zm, m0 / peak); push(x1 + 1, m1, zm, m1 / peak); push(x1 + 2, h1, zt, h1 / peak)
    push(x0 + 1, m0, zm, m0 / peak); push(x1 + 2, h1, zt, h1 / peak); push(x0 + 2, h0, zt, h0 / peak)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.computeVertexNormals()
  const colors = new Float32Array(tops.length * 3)
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }))
  const base = new THREE.Color()
  const snow = new THREE.Color(0xf5f7fa)
  const c = new THREE.Color()
  return {
    mesh,
    recolor(color, snowLine) {
      base.setHex(color)
      tops.forEach((t, i) => {
        c.copy(base).multiplyScalar(0.92 + t * 0.12)
        if (t >= snowLine) c.copy(snow)
        colors[i * 3] = c.r
        colors[i * 3 + 1] = c.g
        colors[i * 3 + 2] = c.b
      })
      ;(geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true
    },
  }
}

export interface Lake { group: THREE.Group; water: THREE.MeshPhongMaterial; pads: THREE.Group; setFrozen(frozen: boolean, palette: GardenPalette): void }

/** 河面：沿中心线铺一条带状网格，宽度随下游渐宽，岸线微微起伏 */
export function makeLake(kit: Kit): Lake {
  const n = RIVER_SAMPLES.length
  const positions: number[] = []
  const indices: number[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const wobble = 1 + 0.08 * Math.sin(i * 0.7) + 0.05 * Math.cos(i * 1.9)
    for (const side of [-1, 1]) {
      const p = riverPoint(t, side * wobble, 0)
      positions.push(p.x, 0, p.z)
    }
    if (i < n - 1) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  const water = new THREE.MeshPhongMaterial({ color: 0x8fc0d6, specular: 0xbfd6e6, shininess: 90, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
  const surface = new THREE.Mesh(geometry, water)
  surface.receiveShadow = true
  const group = new THREE.Group()
  group.position.y = 0.03
  group.add(surface)

  // 荷叶长在下游河湾的缓水处
  const pads = new THREE.Group()
  const rand = seeded(23)
  for (let i = 0; i < 6; i++) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.3 + rand() * 0.1, 0.3, 0.03, 10, 1, false, 0.3, Math.PI * 1.85), kit.matte(0x5f9a58))
    pad.position.copy(riverPoint(0.72 + rand() * 0.12, 0.45 + rand() * 0.4, -0.01))
    pad.rotation.y = rand() * Math.PI * 2
    pad.receiveShadow = true
    pads.add(pad)
  }
  const bloom = kit.blob([0.11, 0.08, 0.11], 0xf3b6c8)
  bloom.position.copy(pads.children[0]!.position).setY(0.06)
  pads.add(bloom)
  group.add(pads)
  return {
    group,
    water,
    pads,
    setFrozen(frozen, palette) {
      water.color.setHex(frozen ? 0xdde9ef : palette.lake)
      water.shininess = frozen ? 140 : 90
      water.opacity = frozen ? 0.96 : 0.9
      pads.visible = !frozen
    },
  }
}

export interface Cabin { group: THREE.Group; window: THREE.MeshLambertMaterial; light: THREE.PointLight; roofSnow: THREE.Mesh; chimneyTop: THREE.Vector3 }

/** 木屋：原木墙、坡屋顶、门、亮灯的窗与烟囱 */
export function makeCabin(kit: Kit): Cabin {
  const group = new THREE.Group()
  const w = 4.2
  const d = 3.2
  const h = 2.3
  group.add(kit.box([w, h, d], 0xb9875a, [0, h / 2, 0]))
  // 原木横纹
  for (let y = 0.35; y < h; y += 0.42) {
    group.add(kit.box([w + 0.06, 0.06, 0.04], 0x9a6e47, [0, y, d / 2 + 0.01]))
    const side = kit.box([0.04, 0.06, d + 0.06], 0x9a6e47, [w / 2 + 0.01, y, 0])
    group.add(side)
  }
  const roofShape = new THREE.Shape()
  roofShape.moveTo(-w / 2 - 0.45, 0)
  roofShape.lineTo(w / 2 + 0.45, 0)
  roofShape.lineTo(0, 1.75)
  roofShape.closePath()
  const roofGeometry = new THREE.ExtrudeGeometry(roofShape, { depth: d + 0.7, bevelEnabled: false })
  roofGeometry.translate(0, 0, -(d + 0.7) / 2)
  const roof = new THREE.Mesh(roofGeometry, kit.matte(0x8c4b3d))
  roof.position.y = h
  roof.castShadow = true
  group.add(roof)
  const roofSnow = new THREE.Mesh(roofGeometry.clone(), kit.matte(0xf6f8fa))
  roofSnow.scale.set(1.02, 0.98, 1.02)
  roofSnow.position.y = h + 0.12
  roofSnow.visible = false
  group.add(roofSnow)

  group.add(kit.box([0.85, 1.5, 0.08], 0x6b4a33, [-1.05, 0.75, d / 2 + 0.05]))
  group.add(kit.box([1.3, 0.16, 0.7], 0x8f7c66, [-1.05, 0.08, d / 2 + 0.35]))
  const windowMaterial = new THREE.MeshLambertMaterial({ color: 0xf3e3b6, emissive: 0xffbf66, emissiveIntensity: 0 })
  const front = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.72, 0.06), windowMaterial)
  front.position.set(0.95, 1.35, d / 2 + 0.04)
  group.add(front)
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.9), windowMaterial)
  side.position.set(w / 2 + 0.04, 1.35, 0)
  group.add(side)
  group.add(kit.box([0.06, 0.72, 0.07], 0x6b4a33, [0.95, 1.35, d / 2 + 0.07]))
  group.add(kit.box([0.85, 0.06, 0.07], 0x6b4a33, [0.95, 1.35, d / 2 + 0.07]))
  group.add(kit.box([0.5, 1.4, 0.5], 0x9a8f84, [1.15, h + 1.15, -0.6]))

  const light = new THREE.PointLight(0xffb35c, 0, 7, 1.6)
  light.position.set(0.95, 1.3, d / 2 + 0.8)
  group.add(light)
  group.position.set(CABIN.x, groundHeight(CABIN.x, CABIN.z), CABIN.z)
  group.rotation.y = CABIN.yaw
  group.updateMatrixWorld(true)
  const chimneyTop = new THREE.Vector3(1.15, h + 1.9, -0.6).applyMatrix4(group.matrixWorld)
  return { group, window: windowMaterial, light, roofSnow, chimneyTop }
}

export function makeFence(kit: Kit): THREE.Group {
  const group = new THREE.Group()
  const [x0, z0] = FENCE.from
  const [x1, z1] = FENCE.to
  const n = 8
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const x = lerp(x0, x1, t)
    const z = lerp(z0, z1, t)
    group.add(kit.box([0.12, 0.95, 0.12], 0xb39472, [x, groundHeight(x, z) + 0.45, z]))
  }
  const len = Math.hypot(x1 - x0, z1 - z0)
  const angle = Math.atan2(-(z1 - z0), x1 - x0)
  for (const y of [0.35, 0.7]) {
    const rail = kit.box([len, 0.07, 0.05], 0xa3845f, [(x0 + x1) / 2, groundHeight((x0 + x1) / 2, (z0 + z1) / 2) + y, (z0 + z1) / 2])
    rail.rotation.y = angle
    group.add(rail)
  }
  return group
}

export interface Tree {
  group: THREE.Group
  /** 树冠（含枝桠），随风摆动 */
  crown: THREE.Group
  leaves: THREE.Group
  bare: THREE.Group
  snow: THREE.Group
  /** 侧枝末端：小鸟、猫头鹰的落脚点（本地坐标） */
  perch: THREE.Vector3
  setSeason(palette: GardenPalette, snowy: boolean): void
}

/** 落叶乔木：主干 + 枝桠 + 低多边形树冠；冬天只剩枝桠 */
export function makeTree(kit: Kit, seed: number, withPerch: boolean): Tree {
  const group = new THREE.Group()
  const rand = seeded(seed)
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(TREE.rTop, TREE.rBase, TREE.height, 8), kit.matte(0x7d5f45))
  trunk.position.y = TREE.height / 2
  trunk.castShadow = true
  group.add(trunk)
  const crown = new THREE.Group()
  crown.position.y = TREE.height - 0.2
  group.add(crown)
  const limb = (from: THREE.Vector3, to: THREE.Vector3, r: number) => {
    const dir = to.clone().sub(from)
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, dir.length(), 6), kit.matte(0x7d5f45))
    mesh.position.copy(from).addScaledVector(dir, 0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    mesh.castShadow = true
    return mesh
  }
  const bare = new THREE.Group()
  const limbs = [new THREE.Vector3(-1.1, 1.3, 0.2), new THREE.Vector3(1.0, 1.5, -0.2), new THREE.Vector3(0.1, 1.9, 0.4), new THREE.Vector3(0.3, 1.4, -0.8)]
  const snow = new THREE.Group()
  for (const end of limbs) {
    bare.add(limb(new THREE.Vector3(0, 0, 0), end, 0.16))
    for (let k = 0; k < 3; k++) {
      const twigEnd = end.clone().add(new THREE.Vector3((rand() - 0.5) * 1.1, 0.5 + rand() * 0.6, (rand() - 0.5) * 0.8))
      bare.add(limb(end, twigEnd, 0.07))
      const cap = kit.blob([0.16, 0.05, 0.12], 0xf6f8fa, [twigEnd.x, twigEnd.y + 0.04, twigEnd.z])
      cap.castShadow = false
      snow.add(cap)
    }
  }
  crown.add(bare)
  crown.add(snow)
  const leaves = new THREE.Group()
  const blobs: [number, number, number, number][] = [[0, 1.6, 0, 1.45], [-1.15, 1.15, 0.3, 1.1], [1.15, 1.25, -0.1, 1.15], [0.2, 2.35, -0.2, 1.1], [-0.6, 2.1, -0.6, 0.95], [0.75, 1.0, 0.75, 0.95], [-0.2, 0.9, -0.95, 1.0]]
  blobs.forEach(([x, y, z, r], i) => {
    const mesh = new THREE.Mesh(jitter(new THREE.IcosahedronGeometry(r, 1), 0.22, seed + i), kit.matte(0x6aa25f))
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.userData.tone = i % 3
    leaves.add(mesh)
  })
  const accents = new THREE.Group()
  for (let i = 0; i < 9; i++) {
    const a = rand() * Math.PI * 2
    const yy = 0.9 + rand() * 1.6
    const dot = kit.blob([0.12, 0.12, 0.12], 0xe8792f, [Math.cos(a) * 1.55, yy, Math.sin(a) * 1.05 + 0.4], [6, 4])
    dot.castShadow = false
    accents.add(dot)
  }
  leaves.add(accents)
  crown.add(leaves)

  const perch = new THREE.Vector3(-1.75, 2.45, 0.55)
  if (withPerch) group.add(limb(new THREE.Vector3(0, 2.1, 0.15), perch, 0.09))

  return {
    group,
    crown,
    leaves,
    bare,
    snow,
    perch,
    setSeason(palette, snowy) {
      leaves.visible = palette.canopy !== null
      bare.visible = true
      snow.visible = snowy
      if (palette.canopy) {
        leaves.children.forEach(child => {
          const mesh = child as THREE.Mesh
          if (mesh.userData.tone !== undefined) mesh.material = kit.matte(palette.canopy![mesh.userData.tone as number]!)
        })
      }
      accents.visible = palette.accent !== null && palette.canopy !== null
      if (palette.accent !== null) accents.children.forEach(child => { (child as THREE.Mesh).material = kit.matte(palette.accent!) })
    },
  }
}

/** 树干在高度 h 处的半径（松鼠沿树皮爬时贴着这条曲线） */
export function trunkRadius(h: number): number {
  return lerp(TREE.rBase, TREE.rTop, Math.min(1, Math.max(0, h / TREE.height)))
}

export interface Pine { group: THREE.Group; snow: THREE.Group; setColors(pine: [number, number]): void }

export function makePine(kit: Kit, scale: number): Pine {
  const group = new THREE.Group()
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.0, 6), kit.matte(0x6f5541))
  trunk.position.y = 0.5
  trunk.castShadow = true
  group.add(trunk)
  const tiers: [number, number, number][] = [[1.35, 1.7, 1.6], [1.05, 1.5, 2.55], [0.72, 1.3, 3.4]]
  const cones: THREE.Mesh[] = []
  const snow = new THREE.Group()
  tiers.forEach(([r, h, y], i) => {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), kit.matte(0x5f9468))
    cone.position.y = y
    cone.rotation.y = i * 0.4
    cone.castShadow = true
    cones.push(cone)
    group.add(cone)
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.62, h * 0.42, 7), kit.matte(0xf6f8fa))
    cap.position.y = y + h * 0.3
    cap.rotation.y = i * 0.4
    snow.add(cap)
  })
  snow.visible = false
  group.add(snow)
  group.scale.setScalar(scale)
  return {
    group,
    snow,
    setColors([a, b]) { cones.forEach((cone, i) => { cone.material = kit.matte(i % 2 ? b : a) }) },
  }
}

export function makeRock(kit: Kit, size: number, seed: number): THREE.Mesh {
  const mesh = new THREE.Mesh(jitter(new THREE.DodecahedronGeometry(size, 0), size * 0.35, seed), kit.matte(0xa9a69c))
  mesh.scale.y = 0.6
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

export interface Grass { mesh: THREE.InstancedMesh; uniforms: { uTime: { value: number }; uWind: { value: number }; uLean: { value: number } }; recolor(colors: number[]): void }

/** 草叶：实例化的细三角片，顶点着色器里按风力摆动 */
export function makeGrass(count: number): Grass {
  const blade = new THREE.BufferGeometry()
  blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.045, 0, 0, 0.045, 0, 0, 0.012, 0.42, 0, -0.045, 0, 0, 0.012, 0.42, 0, -0.012, 0.42, 0, -0.012, 0.42, 0, 0.012, 0.42, 0, 0.0, 0.62, 0], 3))
  blade.computeVertexNormals()
  const uniforms = { uTime: { value: 0 }, uWind: { value: 0.12 }, uLean: { value: 0 } }
  const material = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide })
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = 'uniform float uTime;\nuniform float uWind;\nuniform float uLean;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec3 grassRoot = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      float sway = sin(uTime * 1.7 + grassRoot.x * 0.35 + grassRoot.z * 0.27) * 0.5 + 0.5 + sin(uTime * 3.1 + grassRoot.x * 1.3) * 0.18;
      float bend = position.y * position.y;
      transformed.x += (sway * uWind + uLean) * bend * 2.2;
      transformed.y -= abs(sway * uWind + uLean) * bend * 0.6;`,
    )
  }
  const mesh = new THREE.InstancedMesh(blade, material, count)
  const rand = seeded(7)
  const matrix = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const posv = new THREE.Vector3()
  let placed = 0
  let guard = 0
  while (placed < count && guard++ < count * 6) {
    const z = -16 + rand() ** 0.6 * 30
    const x = (rand() - 0.5) * 70
    if (lakeDistance(x, z, 0.4) < 1.05) continue
    if (Math.hypot(x - CABIN.x, z - CABIN.z) < 3.1) continue
    const s = 0.7 + rand() * 0.7
    posv.set(x, groundHeight(x, z) - 0.02, z)
    // 每片草叶朝自己的方向略微弯斜，而不是一律竖直
    q.setFromEuler(new THREE.Euler((rand() - 0.5) * 0.5, (rand() - 0.5) * Math.PI * 2, (rand() - 0.5) * 0.5))
    scale.set(s, s * (0.7 + rand() * 0.8), s)
    matrix.compose(posv, q, scale)
    mesh.setMatrixAt(placed, matrix)
    mesh.setColorAt(placed, new THREE.Color(0xffffff))
    placed++
  }
  mesh.count = placed
  const tones = Array.from({ length: placed }, () => Math.floor(rand() * 3))
  const color = new THREE.Color()
  return {
    mesh,
    uniforms,
    recolor(colors) {
      tones.forEach((tone, i) => { color.setHex(colors[tone] ?? colors[0]!); mesh.setColorAt(i, color) })
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    },
  }
}

export interface Flowers { mesh: THREE.InstancedMesh; recolor(colors: number[]): void }

export function makeFlowers(count: number): Flowers {
  const geometry = mergeGeometries([new THREE.IcosahedronGeometry(0.09, 0)])
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ flatShading: true }), count)
  const rand = seeded(19)
  const matrix = new THREE.Matrix4()
  let placed = 0
  while (placed < count) {
    const z = -12 + rand() * 24
    const x = (rand() - 0.5) * 60
    if (lakeDistance(x, z, 0.6) < 1.05 || Math.hypot(x - CABIN.x, z - CABIN.z) < 3.2) continue
    matrix.makeTranslation(x, groundHeight(x, z) + 0.32 + rand() * 0.12, z)
    mesh.setMatrixAt(placed, matrix)
    placed++
  }
  const tones = Array.from({ length: count }, () => rand())
  const color = new THREE.Color()
  return {
    mesh,
    recolor(colors) {
      mesh.visible = colors.length > 0
      if (!colors.length) return
      tones.forEach((t, i) => { color.setHex(colors[Math.floor(t * colors.length)]!); mesh.setColorAt(i, color) })
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    },
  }
}

/** 远处缓坡上的小树影：树冠（圆锥）下露出一截树干 */
export function makeDistantTrees(color: number, count: number): THREE.InstancedMesh {
  const crown = new THREE.ConeGeometry(0.9, 2.4, 6)
  crown.translate(0, 0.45, 0)
  const trunk = new THREE.CylinderGeometry(0.1, 0.14, 1.0, 5)
  trunk.translate(0, -1.0, 0)
  crown.deleteAttribute('uv'); trunk.deleteAttribute('uv')
  const geometry = mergeGeometries([crown, trunk])!
  const colors = new Float32Array(geometry.getAttribute('position').count * 3)
  const crownCount = crown.getAttribute('position').count
  for (let i = 0; i < colors.length / 3; i++) {
    const c = i < crownCount ? [1, 1, 1] : [0.62, 0.48, 0.36]
    colors.set(c, i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshLambertMaterial({ color, flatShading: true, vertexColors: true }), count)
  const rand = seeded(31)
  const matrix = new THREE.Matrix4()
  for (let i = 0; i < count; i++) {
    const x = (rand() - 0.5) * 140
    const z = -24 - rand() * 26
    const s = 0.55 + rand() * 0.6
    matrix.compose(new THREE.Vector3(x, groundHeight(x, z) + 1.2 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s))
    mesh.setMatrixAt(i, matrix)
  }
  return mesh
}

export type LeafyKind = 'birch' | 'round' | 'acacia'
export interface LeafyTree { group: THREE.Group; leaves: THREE.Mesh; setSeason(palette: GardenPalette, snowy: boolean, season: string): void }

/**
 * 更多树种：
 * birch  白桦：细高白干带黑斑，枝条上挑，叶片稀疏细碎；
 * round  圆叶树：几根粗枝撑开，枝头簇生椭圆叶团；
 * acacia 伞形树：主干分叉，树冠平展浓密。
 */
export function makeLeafyTree(kit: Kit, kind: LeafyKind, seed: number): LeafyTree {
  const rand = seeded(seed)
  const group = new THREE.Group()
  const bark = kind === 'birch' ? 0xe9e5da : kind === 'acacia' ? 0x5c4636 : 0x6e5340
  const limb = (from: THREE.Vector3, to: THREE.Vector3, r: number) => {
    const dir = to.clone().sub(from)
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.65, r, dir.length(), 6), kit.matte(bark))
    mesh.position.copy(from).addScaledVector(dir, 0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    mesh.castShadow = true
    group.add(mesh)
  }
  const height = kind === 'birch' ? 4.6 : kind === 'acacia' ? 2.4 : 2.6
  const lean = new THREE.Vector3((rand() - 0.5) * 0.5, height, (rand() - 0.5) * 0.3)
  limb(new THREE.Vector3(0, 0, 0), lean, kind === 'birch' ? 0.16 : 0.3)
  if (kind === 'birch') {
    for (let i = 0; i < 7; i++) {
      const y = 0.4 + i * 0.55 + rand() * 0.2
      const band = kit.box([0.2, 0.05, 0.06], 0x3a342e, [lean.x * (y / height), y, lean.z * (y / height) + 0.12])
      band.castShadow = false
      group.add(band)
    }
  }
  const tips: THREE.Vector3[] = []
  const branchCount = kind === 'birch' ? 6 : kind === 'acacia' ? 4 : 5
  for (let i = 0; i < branchCount; i++) {
    const a = (i / branchCount) * Math.PI * 2 + rand() * 0.6
    const fromY = kind === 'birch' ? height * (0.45 + rand() * 0.45) : height * (0.75 + rand() * 0.2)
    const from = lean.clone().multiplyScalar(fromY / height)
    const reach = kind === 'acacia' ? 1.6 + rand() * 0.6 : kind === 'birch' ? 0.8 + rand() * 0.5 : 1.1 + rand() * 0.5
    const rise = kind === 'acacia' ? 0.9 + rand() * 0.4 : 0.9 + rand() * 0.6
    const to = from.clone().add(new THREE.Vector3(Math.cos(a) * reach, rise, Math.sin(a) * reach * 0.8))
    limb(from, to, kind === 'birch' ? 0.05 : 0.11)
    tips.push(to)
  }
  // 叶片合并成一个网格：一棵树一次绘制
  const parts: THREE.BufferGeometry[] = []
  const tmp = new THREE.Object3D()
  const leafAt = (geometry: THREE.BufferGeometry, p: THREE.Vector3, scale: [number, number, number]) => {
    tmp.position.copy(p)
    tmp.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
    tmp.scale.set(...scale)
    tmp.updateMatrix()
    parts.push(geometry.clone().applyMatrix4(tmp.matrix))
  }
  const ellipsoid = new THREE.SphereGeometry(1, 6, 4)
  ellipsoid.deleteAttribute('uv')
  const card = new THREE.PlaneGeometry(1, 1)
  card.deleteAttribute('uv')
  if (kind === 'round') {
    for (const tip of tips) for (let k = 0; k < 22; k++) {
      leafAt(ellipsoid, tip.clone().add(new THREE.Vector3((rand() - 0.5) * 1.5, (rand() - 0.3) * 0.9, (rand() - 0.5) * 1.2)), [0.24, 0.14, 0.18])
    }
  } else if (kind === 'birch') {
    for (const tip of tips) for (let k = 0; k < 30; k++) {
      const p = tip.clone().lerp(lean.clone().multiplyScalar(0.8), rand() * 0.6)
      leafAt(card, p.add(new THREE.Vector3((rand() - 0.5) * 0.9, (rand() - 0.5) * 0.7, (rand() - 0.5) * 0.9)), [0.2, 0.13, 1])
    }
  } else {
    const center = lean.clone().add(new THREE.Vector3(0, 1.15, 0))
    for (let k = 0; k < 320; k++) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand())
      const p = center.clone().add(new THREE.Vector3(Math.cos(a) * r * 2.4, (rand() - 0.5) * 0.55 * (1 - r * 0.5), Math.sin(a) * r * 1.7))
      leafAt(card, p, [0.42, 0.13, 1])
    }
  }
  const leafGeometry = mergeGeometries(parts)!
  parts.forEach(g => g.dispose())
  ellipsoid.dispose()
  card.dispose()
  leafGeometry.computeVertexNormals()
  const leafMaterial = new THREE.MeshLambertMaterial({ color: 0x6aa25f, flatShading: true, side: THREE.DoubleSide })
  const leaves = new THREE.Mesh(leafGeometry, leafMaterial)
  leaves.castShadow = true
  group.add(leaves)
  const seasonal: Record<LeafyKind, Record<string, number>> = {
    birch: { spring: 0xb9d98f, autumn: 0xe8c65a },
    round: {},
    acacia: { spring: 0xa9cf7d, autumn: 0xd99a45 },
  }
  return {
    group,
    leaves,
    setSeason(palette, snowy, season) {
      leaves.visible = palette.canopy !== null
      if (!palette.canopy) return
      const tone = kind === 'birch' ? palette.canopy[2]! : kind === 'acacia' ? palette.canopy[0]! : palette.canopy[1]!
      leafMaterial.color.setHex(seasonal[kind][season] ?? tone)
      if (snowy) leafMaterial.color.lerp(new THREE.Color(0xf4f6f8), 0.45)
    },
  }
}

/** 在远近不同的位置错落种下各种树（避开河、木屋、大树与栅栏前的空地） */
export function treeSpots(count: number, seed: number): { x: number; z: number; kind: LeafyKind; s: number }[] {
  const rand = seeded(seed)
  const kinds: LeafyKind[] = ['birch', 'round', 'acacia']
  const spots: { x: number; z: number; kind: LeafyKind; s: number }[] = []
  let guard = 0
  while (spots.length < count && guard++ < 800) {
    const z = -34 + rand() * 36
    const x = (rand() - 0.5) * (40 + -z * 1.4)
    if (lakeDistance(x, z, 2.2) < 1) continue
    if (Math.hypot(x - CABIN.x, z - CABIN.z) < 5.5 || Math.hypot(x - TREE.x, z - TREE.z) < 4) continue
    if (z > -6 && x > -1 && x < 9) continue
    if (spots.some(p => Math.hypot(p.x - x, p.z - z) < 4.5)) continue
    if (PINES.some(p => Math.hypot(p.x - x, p.z - z) < 3.5)) continue
    spots.push({ x, z, kind: kinds[spots.length % 3]!, s: 0.8 + rand() * 0.45 })
  }
  return spots
}
