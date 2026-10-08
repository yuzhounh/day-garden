import * as THREE from 'three'
import { type Kit, clamp, easeInOut, lerp, radialTexture, seeded } from './common'
import { TREE, groundHeight, riverFlow, riverPoint, trunkRadius } from './garden-models'

/**
 * 花园里的小动物。每只都在三维空间里运动：朝向跟随速度方向，
 * 翅膀绕身体纵轴扇动，松鼠贴着树皮爬升而不是“悬空”。
 * 本地坐标约定：+x 为前进方向，+y 为背部（上），+z 为左侧。
 */

const UP = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)
const X_AXIS = new THREE.Vector3(1, 0, 0)

/** 让物体的 +x 指向 dir（只绕竖直轴转向），可再叠加俯仰 pitch（绕本地 z 轴） */
function orient(obj: THREE.Object3D, dir: THREE.Vector3, pitch = 0, roll = 0) {
  const yaw = Math.atan2(-dir.z, dir.x)
  const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw)
  if (pitch) q.multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, pitch))
  if (roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(X_AXIS, roll))
  obj.quaternion.copy(q)
}

/** 翅膀：形状位于本地 xz 平面、向 +z（左）展开；右翼镜像。扇动 = 绕本地 x 轴（身体纵轴）旋转 */
function makeWings(kit: Kit, outline: [number, number][], color: number, at: [number, number, number] = [0, 0, 0]) {
  const shape = new THREE.Shape()
  outline.forEach(([x, z], i) => (i ? shape.lineTo(x, z) : shape.moveTo(x, z)))
  shape.closePath()
  const geometry = new THREE.ShapeGeometry(shape)
  geometry.rotateX(Math.PI / 2)
  const material = kit.matte(color, { side: THREE.DoubleSide, flat: false })
  const left = new THREE.Group()
  const right = new THREE.Group()
  const lw = new THREE.Mesh(geometry, material)
  const rw = new THREE.Mesh(geometry, material)
  rw.scale.z = -1
  lw.castShadow = rw.castShadow = true
  left.add(lw)
  right.add(rw)
  left.position.set(...at)
  right.position.set(...at)
  return {
    left,
    right,
    /** angle > 0 翅膀上抬 */
    flap(angle: number) { left.rotation.x = -angle; right.rotation.x = angle },
  }
}

export interface Creature { object: THREE.Object3D; update(time: number, dt: number): void }

/* ———————————————————— 松鼠 ———————————————————— */

export class Squirrel {
  object = new THREE.Group()
  private body = new THREE.Group()
  private legs: THREE.Mesh[] = []
  private t = -1
  private start = new THREE.Vector3()
  private ctrl = new THREE.Vector3()
  private base = new THREE.Vector3()
  private treeBase = new THREE.Vector3()
  /** 树干上朝向相机的一侧（水平单位向量），松鼠贴着这一侧爬 */
  private side = new THREE.Vector3(0, 0, 1)

  constructor(kit: Kit) {
    const fur = 0xb8743f
    // 原点在脚下；身体沿 +x
    this.body.add(kit.blob([0.2, 0.12, 0.12], fur, [0, 0.14, 0]))
    this.body.add(kit.blob([0.11, 0.095, 0.09], fur, [0.21, 0.21, 0]))
    this.body.add(kit.blob([0.06, 0.05, 0.05], 0xe9d2b4, [0.06, 0.08, 0]))
    for (const s of [1, -1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), kit.matte(fur))
      ear.position.set(0.2, 0.31, 0.045 * s)
      this.body.add(ear)
      this.body.add(kit.blob([0.016, 0.016, 0.016], 0x1f1a16, [0.29, 0.23, 0.05 * s], [5, 4]))
    }
    this.body.add(kit.blob([0.02, 0.02, 0.02], 0x2b241d, [0.32, 0.2, 0], [5, 4]))
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.16, 0.13, 0), new THREE.Vector3(-0.32, 0.2, 0), new THREE.Vector3(-0.37, 0.38, 0),
      new THREE.Vector3(-0.28, 0.53, 0), new THREE.Vector3(-0.16, 0.52, 0),
    ])
    const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 18, 0.07, 7), kit.matte(0xc98a5a, { flat: false }))
    tail.castShadow = true
    this.body.add(tail)
    for (const [x, s, w] of [[0.12, 1, 0.04], [0.12, -1, 0.04], [-0.1, 1, 0.07], [-0.1, -1, 0.07]] as const) {
      const leg = kit.box([w, 0.1, 0.04], fur, [x, 0.05, 0.07 * s])
      leg.geometry.translate(0, -0.03, 0)
      this.legs.push(leg)
      this.body.add(leg)
    }
    this.body.scale.setScalar(1.25)
    this.object.add(this.body)
    this.object.visible = false
  }

  get active() { return this.t >= 0 }
  /** 本次动作已进行的秒数（未在动作中为 -1） */
  get elapsed() { return this.t }

  private mode: 'up' | 'down' = 'up'
  private end = new THREE.Vector3()

  /** 树干表面上高度 h 处、在当前一侧（side）的点 */
  private onTrunk(h: number, out: THREE.Vector3) {
    return out.copy(this.treeBase).addScaledVector(this.side, trunkRadius(h) + 0.03).setY(this.treeBase.y + h)
  }

  private bezier(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, u: number, out: THREE.Vector3, tangent: THREE.Vector3) {
    const k = 1 - u
    out.set(0, 0, 0).addScaledVector(a, k * k).addScaledVector(b, 2 * k * u).addScaledVector(c, u * u)
    tangent.copy(b).sub(a).multiplyScalar(2 * k).addScaledVector(c.clone().sub(b), 2 * u)
    tangent.y = 0
  }

  /**
   * up：从草地跑来，在树下以脚为支点转身，贴着树皮爬进树冠；
   * down：从树冠里出来，头朝下沿树干爬下，落地后转身跑开。
   * 每次随机从树干正面、左侧或右侧（相对相机）爬。
   */
  run(tree: THREE.Vector3, camera: THREE.Vector3, mode: 'up' | 'down') {
    this.mode = mode
    this.treeBase.copy(tree)
    const toCamera = new THREE.Vector3(camera.x - tree.x, 0, camera.z - tree.z).normalize()
    const angle = [0, -1.15, 1.15][Math.floor(Math.random() * 3)]!
    this.side.copy(toCamera).applyAxisAngle(UP, angle)
    this.onTrunk(0, this.base)
    this.ctrl.copy(tree).addScaledVector(this.side, 2.4)
    // 横穿方向：与 side 垂直，朝画面外侧
    const across = new THREE.Vector3(-this.side.z, 0, this.side.x)
    if (across.x < 0) across.negate()
    if (angle > 0) across.negate()
    const far = this.ctrl.clone().addScaledVector(across, 9)
    far.y = groundHeight(far.x, far.z)
    if (mode === 'up') this.start.copy(far)
    else this.end.copy(far)
    this.t = 0
    this.object.visible = true
    this.object.scale.setScalar(mode === 'up' ? 1 : 0)
  }

  private gait(t: number, dir: THREE.Vector3, p: THREE.Vector3) {
    const g = Math.abs(Math.sin(t * 13))
    p.y += g * 0.08
    this.object.position.copy(p)
    orient(this.object, dir, (g - 0.5) * 0.25)
    this.legs.forEach((leg, i) => { leg.rotation.z = Math.sin(t * 13 + (i < 2 ? 0 : Math.PI)) * 0.7 })
  }

  private climbPose(h: number, t: number, headUp: boolean, p: THREE.Vector3) {
    this.object.position.copy(this.onTrunk(h, p))
    // 头朝上：面向树干、俯仰 +90°；头朝下：背向树干、俯仰 -90°。背部始终朝外，腹部贴着树皮
    if (headUp) orient(this.object, this.side.clone().negate(), Math.PI / 2)
    else orient(this.object, this.side, -Math.PI / 2)
    this.legs.forEach((leg, i) => { leg.rotation.z = Math.sin(t * 16 + (i < 2 ? 0 : Math.PI)) * 0.6 })
  }

  update(dt: number) {
    if (this.t < 0) return
    this.t += dt
    const t = this.t
    const p = new THREE.Vector3()
    const dir = new THREE.Vector3()
    const top = TREE.height + 0.4
    if (this.mode === 'up') {
      const runEnd = 3.0
      const turnEnd = 3.45
      const climbEnd = 6.8
      if (t < runEnd) {
        this.bezier(this.start, this.ctrl, this.base, easeInOut(t / runEnd), p, dir)
        p.y = groundHeight(p.x, p.z)
        this.gait(t, dir, p)
      } else if (t < turnEnd) {
        // 以脚为支点抬起身体（俯仰 0 → 90°），同时脚沿树皮上移，尾巴始终在地面之上
        const u = easeInOut((t - runEnd) / (turnEnd - runEnd))
        this.object.position.copy(this.onTrunk(lerp(0.02, 0.38, u), p))
        orient(this.object, this.side.clone().negate(), (u * Math.PI) / 2)
        this.legs.forEach(leg => { leg.rotation.z = 0 })
      } else if (t < climbEnd + 0.6) {
        const u = clamp((t - turnEnd) / (climbEnd - turnEnd), 0, 1.15)
        const h = 0.38 + (u + Math.sin(u * Math.PI * 9) * 0.025) * (top - 0.38)
        this.climbPose(h, t, true, p)
        if (t > climbEnd) this.object.scale.setScalar(clamp(1 - (t - climbEnd) / 0.6, 0, 1))
      } else this.finish()
      return
    }
    // 下树
    const appear = 0.5
    const descendEnd = 3.9
    const turnEnd = 4.4
    const runEnd = 7.2
    if (t < descendEnd) {
      const u = clamp((t - appear * 0.4) / (descendEnd - appear * 0.4), 0, 1)
      const h = top - (u + Math.sin(u * Math.PI * 9) * 0.025) * (top - 0.5)
      this.climbPose(h, t, false, p)
      this.object.scale.setScalar(clamp(t / appear, 0, 1))
    } else if (t < turnEnd) {
      // 落地：俯仰 -90° → 0，脚从树皮回到地面，头不会扎进土里
      const u = easeInOut((t - descendEnd) / (turnEnd - descendEnd))
      this.object.position.copy(this.onTrunk(lerp(0.5, 0.02, u), p))
      orient(this.object, this.side, (-1 + u) * (Math.PI / 2))
      this.legs.forEach(leg => { leg.rotation.z = 0 })
    } else if (t < runEnd) {
      this.bezier(this.base, this.ctrl, this.end, easeInOut((t - turnEnd) / (runEnd - turnEnd)), p, dir)
      p.y = groundHeight(p.x, p.z)
      this.gait(t, dir, p)
    } else this.finish()
  }

  private finish() {
    this.t = -1
    this.object.visible = false
  }
}

/* ———————————————————— 蝴蝶 ———————————————————— */

export class Butterfly {
  object = new THREE.Group()
  private wings: ReturnType<typeof makeWings>
  private phase: number
  private center: THREE.Vector3
  private last = new THREE.Vector3()

  constructor(kit: Kit, center: THREE.Vector3, colors: [number, number], seed: number) {
    this.center = center
    this.phase = seed * 1.7
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.16, 5), kit.matte(0x3b3028))
    body.rotation.z = Math.PI / 2
    this.object.add(body)
    // 前翅 + 后翅（向 +z 展开），再镜像出右翼
    this.wings = makeWings(kit, [[0.02, 0], [0.09, 0.07], [0.07, 0.16], [0.0, 0.15], [-0.02, 0.05]], colors[0])
    const hind = makeWings(kit, [[-0.01, 0.01], [0.0, 0.08], [-0.07, 0.12], [-0.1, 0.05]], colors[1])
    this.wings.left.add(hind.left.children[0]!)
    this.wings.right.add(hind.right.children[0]!)
    this.object.add(this.wings.left, this.wings.right)
    this.object.scale.setScalar(2)
    this.object.position.copy(center)
  }

  update(time: number) {
    const t = time + this.phase
    const p = new THREE.Vector3(
      this.center.x + Math.sin(t * 0.5) * 1.7 + Math.sin(t * 1.9) * 0.25,
      this.center.y + 0.75 + Math.sin(t * 1.3) * 0.35 + Math.sin(t * 4.1) * 0.08,
      this.center.z + Math.sin(t * 0.37 + 1) * 1.1,
    )
    const v = p.clone().sub(this.last)
    this.last.copy(p)
    this.object.position.copy(p)
    if (v.lengthSq() > 1e-8) orient(this.object, v, clamp(v.y * 18, -0.4, 0.4))
    // 每隔一会儿张开翅膀滑翔一下
    const glide = Math.sin(t * 0.8) > 0.92
    this.wings.flap(glide ? 0.35 : 0.45 + Math.sin(t * 58) * 0.85)
  }
}

/* ———————————————————— 飞鸟 ———————————————————— */

function makeFlyingBird(kit: Kit, color: number) {
  const group = new THREE.Group()
  group.add(kit.blob([0.17, 0.055, 0.055], color, [0, 0, 0]))
  group.add(kit.blob([0.06, 0.05, 0.05], color, [0.16, 0.025, 0]))
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 4), kit.matte(0xd9a24a))
  beak.rotation.z = -Math.PI / 2
  beak.position.set(0.24, 0.02, 0)
  group.add(beak)
  const tail = makeWings(kit, [[-0.14, 0], [-0.3, 0.05], [-0.28, -0.0]], color)
  tail.left.rotation.x = -0.1
  group.add(tail.left)
  const wings = makeWings(kit, [[0.06, 0], [0.02, 0.32], [-0.06, 0.34], [-0.07, 0]], color, [0, 0.02, 0.03])
  group.add(wings.left, wings.right)
  return { group, wings }
}

/** 鸟群：三只排成斜线，从一侧飞过远山上空 */
export class Flock {
  object = new THREE.Group()
  private birds: { group: THREE.Group; wings: ReturnType<typeof makeWings>; offset: THREE.Vector3; phase: number }[] = []
  private t = -1
  private dir = 1
  private readonly duration = 18

  constructor(kit: Kit) {
    const offsets = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-1.2, 0.35, -0.8), new THREE.Vector3(-2.1, -0.15, 0.6)]
    offsets.forEach((offset, i) => {
      const bird = makeFlyingBird(kit, 0x4a5260)
      bird.group.scale.setScalar(1.6 - i * 0.15)
      this.object.add(bird.group)
      this.birds.push({ ...bird, offset, phase: i * 0.7 })
    })
    this.object.visible = false
  }

  fly(direction: 1 | -1) { this.dir = direction; this.t = 0; this.object.visible = true }

  update(dt: number) {
    if (this.t < 0) return
    this.t += dt
    const u = this.t / this.duration
    if (u >= 1) { this.t = -1; this.object.visible = false; return }
    const x = lerp(-48, 48, u) * this.dir
    const v = new THREE.Vector3(this.dir, Math.cos(u * 9) * 0.05, 0)
    this.birds.forEach(bird => {
      const p = new THREE.Vector3(x - bird.offset.x * this.dir, 8.5 + bird.offset.y + Math.sin(u * 9 + bird.phase) * 0.4, -22 + bird.offset.z)
      bird.group.position.copy(p)
      orient(bird.group, v, v.y * 4)
      const glide = Math.sin(this.t * 0.9 + bird.phase) > 0.55
      bird.wings.flap(glide ? 0.12 : Math.sin(this.t * 13 + bird.phase) * 0.75)
    })
  }
}

/** 燕子：雨天贴着湖面掠过 */
export class Swallow {
  object = new THREE.Group()
  private bird: ReturnType<typeof makeFlyingBird>
  private t = -1
  private readonly duration = 5

  constructor(kit: Kit) {
    this.bird = makeFlyingBird(kit, 0x2f3540)
    this.bird.group.scale.setScalar(1.3)
    this.object.add(this.bird.group)
    this.object.visible = false
  }

  skim() { this.t = 0; this.object.visible = true }

  update(dt: number) {
    if (this.t < 0) return
    this.t += dt
    const u = this.t / this.duration
    if (u >= 1) { this.t = -1; this.object.visible = false; return }
    // 沿着河道贴水面掠过：从近处飞向上游，中途俯冲到水面
    const dip = Math.exp(-(((u - 0.5) * 6) ** 2))
    const along = (v: number) => lerp(0.98, 0.42, v)
    const p = riverPoint(along(u), Math.sin(u * 5) * 0.6, 3.4 - dip * 2.9)
    const next = riverPoint(along(u + 0.01), Math.sin((u + 0.01) * 5) * 0.6, 3.4 - Math.exp(-(((u + 0.01 - 0.5) * 6) ** 2)) * 2.9)
    orient(this.bird.group, next.sub(p), 0)
    this.bird.group.position.copy(p)
    this.bird.wings.flap(dip > 0.5 ? 0.15 : Math.sin(this.t * 16) * 0.8)
  }
}

/* ———————————————————— 枝头小鸟 / 猫头鹰 ———————————————————— */

export class PerchedBird {
  object = new THREE.Group()
  private sparrow = new THREE.Group()
  private owl = new THREE.Group()
  private head = new THREE.Group()
  private wings: THREE.Mesh[] = []
  private owlLids: THREE.Mesh[] = []
  private breast: THREE.Mesh
  private hop = -1

  constructor(kit: Kit) {
    // 麻雀：面朝 +x
    this.sparrow.add(kit.blob([0.13, 0.1, 0.09], 0xa7865f, [0, 0.12, 0]))
    this.breast = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshLambertMaterial({ color: 0xecdfcd, flatShading: true }))
    this.breast.scale.set(0.09, 0.075, 0.075)
    this.breast.position.set(0.05, 0.1, 0)
    this.sparrow.add(this.breast)
    this.head.position.set(0.11, 0.21, 0)
    this.head.add(kit.blob([0.07, 0.065, 0.065], 0x8f6f4f))
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 4), kit.matte(0xe2a64a))
    beak.rotation.z = -Math.PI / 2
    beak.position.set(0.075, -0.005, 0)
    this.head.add(beak)
    for (const s of [1, -1]) this.head.add(kit.blob([0.012, 0.012, 0.012], 0x221c17, [0.04, 0.02, 0.045 * s], [5, 4]))
    this.sparrow.add(this.head)
    const tail = kit.box([0.12, 0.02, 0.06], 0x7d6246, [-0.15, 0.13, 0])
    tail.rotation.z = 0.35
    this.sparrow.add(tail)
    for (const s of [1, -1]) {
      const wing = kit.blob([0.1, 0.055, 0.025], 0x7d6246, [-0.01, 0.13, 0.07 * s])
      this.wings.push(wing)
      this.sparrow.add(wing)
    }
    this.sparrow.add(kit.box([0.01, 0.06, 0.01], 0x8a6f55, [0.0, 0.03, 0.03]), kit.box([0.01, 0.06, 0.01], 0x8a6f55, [0.0, 0.03, -0.03]))
    this.sparrow.scale.setScalar(1.6)

    // 猫头鹰：正面朝向相机（+z）
    this.owl.add(kit.blob([0.17, 0.24, 0.16], 0x8c7660, [0, 0.24, 0]))
    this.owl.add(kit.blob([0.12, 0.16, 0.06], 0xd8c7ae, [0, 0.2, 0.11]))
    for (const s of [1, -1]) {
      this.owl.add(kit.blob([0.055, 0.055, 0.02], 0xf2e3b0, [0.07 * s, 0.34, 0.14], [8, 6]))
      this.owl.add(kit.blob([0.024, 0.024, 0.01], 0x231d18, [0.07 * s, 0.34, 0.16], [6, 4]))
      const lid = kit.blob([0.058, 0.058, 0.02], 0x7d6853, [0.07 * s, 0.34, 0.15], [8, 6])
      lid.scale.y = 0.001
      this.owlLids.push(lid)
      this.owl.add(lid)
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 4), kit.matte(0x8c7660))
      tuft.position.set(0.1 * s, 0.48, 0)
      tuft.rotation.z = -0.3 * s
      this.owl.add(tuft)
    }
    const owlBeak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), kit.matte(0xd39a45))
    owlBeak.rotation.x = Math.PI
    owlBeak.position.set(0, 0.29, 0.16)
    this.owl.add(owlBeak)
    this.owl.scale.setScalar(1.25)

    this.object.add(this.sparrow, this.owl)
  }

  set(mode: 'sparrow' | 'robin' | 'owl' | 'none') {
    this.object.visible = mode !== 'none'
    this.sparrow.visible = mode === 'sparrow' || mode === 'robin'
    this.owl.visible = mode === 'owl'
    ;(this.breast.material as THREE.MeshLambertMaterial).color.setHex(mode === 'robin' ? 0xe07a4f : 0xecdfcd)
  }

  hopNow() { this.hop = 0 }

  update(time: number, dt: number) {
    // 麻雀：歪头、啄羽；跳一下时张翅转身
    this.head.rotation.z = Math.sin(time * 0.9) > 0.85 ? -0.5 : 0
    this.head.rotation.y = Math.sin(time * 0.6) * 0.5
    if (this.hop >= 0) {
      this.hop += dt
      const u = this.hop / 1.4
      if (u >= 1) { this.hop = -1; this.sparrow.position.set(0, 0, 0); this.sparrow.rotation.y = 0; this.wings.forEach(w => { w.rotation.x = 0 }) }
      else {
        this.sparrow.position.set(-Math.sin(u * Math.PI) * 0.25, Math.abs(Math.sin(u * Math.PI * 2)) * 0.18, 0)
        this.sparrow.rotation.y = u < 0.5 ? 0 : Math.PI
        this.wings.forEach((w, i) => { w.rotation.x = (i ? -1 : 1) * Math.abs(Math.sin(u * Math.PI * 8)) * 0.9 })
      }
    }
    // 猫头鹰：每隔几秒眨一次眼
    const blink = (time % 5.5) > 5.35 ? 1 : 0.001
    this.owlLids.forEach(lid => { lid.scale.y = blink })
    this.owl.rotation.y = Math.sin(time * 0.35) * 0.4
  }
}

/* ———————————————————— 地面上的小动物 ———————————————————— */

export class Rabbit {
  object = new THREE.Group()
  private body = new THREE.Group()
  private t = -1
  private dir = 1
  private readonly duration = 10

  constructor(kit: Kit) {
    const fur = 0xc9b39a
    this.body.add(kit.blob([0.3, 0.2, 0.2], fur, [0, 0.22, 0]))
    this.body.add(kit.blob([0.13, 0.12, 0.11], fur, [0.27, 0.36, 0]))
    for (const s of [1, -1]) {
      const ear = kit.blob([0.04, 0.17, 0.06], fur, [0.24, 0.55, 0.05 * s])
      ear.rotation.z = 0.25
      this.body.add(ear)
      this.body.add(kit.blob([0.015, 0.015, 0.015], 0x2a221c, [0.36, 0.39, 0.07 * s], [5, 4]))
    }
    this.body.add(kit.blob([0.07, 0.07, 0.07], 0xf6f0e8, [-0.3, 0.27, 0]))
    this.body.add(kit.blob([0.15, 0.07, 0.08], fur, [-0.1, 0.06, 0.1]), kit.blob([0.15, 0.07, 0.08], fur, [-0.1, 0.06, -0.1]))
    this.object.add(this.body)
    this.object.visible = false
  }

  run(direction: 1 | -1) { this.dir = direction; this.t = 0; this.object.visible = true }

  update(dt: number) {
    if (this.t < 0) return
    this.t += dt
    const u = this.t / this.duration
    if (u >= 1) { this.t = -1; this.object.visible = false; return }
    const x = lerp(-30, 30, u) * this.dir
    const z = 4.2 + Math.sin(u * 4) * 0.8
    const hop = this.t * 2.2 % 1
    const y = groundHeight(x, z) + Math.sin(hop * Math.PI) * 0.32
    this.object.position.set(x, y, z)
    orient(this.object, new THREE.Vector3(this.dir, 0, Math.cos(u * 4) * 0.2 * this.dir), (0.5 - hop) * 0.5)
  }
}

export class Hedgehog {
  object = new THREE.Group()
  private t = -1
  private readonly duration = 22
  private startX = 0

  constructor(kit: Kit) {
    const spines = new THREE.Mesh(jitterSpiky(), kit.matte(0x6f5a46))
    spines.scale.set(0.26, 0.17, 0.2)
    spines.position.y = 0.1
    spines.castShadow = true
    this.object.add(spines)
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 6), kit.matte(0xd1b896))
    snout.rotation.z = -Math.PI / 2
    snout.position.set(0.27, 0.08, 0)
    this.object.add(snout)
    this.object.add(kit.blob([0.018, 0.018, 0.018], 0x231d18, [0.35, 0.08, 0], [5, 4]))
    this.object.visible = false
  }

  walk(startX: number) { this.startX = startX; this.t = 0; this.object.visible = true }

  update(dt: number) {
    if (this.t < 0) return
    this.t += dt
    const u = this.t / this.duration
    if (u >= 1) { this.t = -1; this.object.visible = false; return }
    const x = this.startX + u * 9
    const z = 3 + Math.sin(u * 3) * 0.6
    this.object.position.set(x, groundHeight(x, z) + Math.abs(Math.sin(this.t * 9)) * 0.015, z)
    orient(this.object, new THREE.Vector3(1, 0, Math.cos(u * 3) * 0.2))
    this.object.scale.setScalar(Math.min(1, u * 8, (1 - u) * 8))
  }
}

function jitterSpiky(): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 2)
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  const rand = seeded(5)
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const k = y > -0.1 ? 1 + rand() * 0.35 : 1
    pos.setXYZ(i, pos.getX(i) * k, Math.max(-0.2, y) * k, pos.getZ(i) * k)
  }
  geometry.computeVertexNormals()
  return geometry
}

/** 青蛙：雨天蹲在荷叶上，偶尔跳到另一片 */
export class Frog {
  object = new THREE.Group()
  private from = new THREE.Vector3()
  private to = new THREE.Vector3()
  private t = -1
  private pads: THREE.Vector3[]

  constructor(kit: Kit, pads: THREE.Vector3[]) {
    this.pads = pads
    this.object.add(kit.blob([0.13, 0.08, 0.12], 0x6fa35f, [0, 0.07, 0]))
    this.object.add(kit.blob([0.08, 0.05, 0.08], 0xd9e8b8, [0.03, 0.05, 0]))
    for (const s of [1, -1]) {
      this.object.add(kit.blob([0.035, 0.035, 0.035], 0x8fbd7c, [0.08, 0.15, 0.05 * s], [6, 4]))
      this.object.add(kit.blob([0.015, 0.015, 0.015], 0x1f241c, [0.105, 0.16, 0.05 * s], [5, 4]))
    }
    this.object.scale.setScalar(1.5)
    this.object.position.copy(pads[0]!)
    this.from.copy(pads[0]!)
    this.object.rotation.y = -Math.PI / 2
  }

  hop() {
    this.from.copy(this.object.position)
    this.to.copy(this.pads[Math.floor(Math.random() * this.pads.length)]!)
    this.t = 0
  }

  update(dt: number) {
    if (this.t < 0) return
    this.t += dt
    const u = clamp(this.t / 0.8, 0, 1)
    const p = new THREE.Vector3().lerpVectors(this.from, this.to, easeInOut(u))
    p.y += Math.sin(u * Math.PI) * 0.6
    this.object.position.copy(p)
    const dir = this.to.clone().sub(this.from)
    if (dir.lengthSq() > 0.01) orient(this.object, dir, (0.5 - u) * 0.8)
    if (u >= 1) this.t = -1
  }
}

/** 野鸭：沿湖面椭圆慢慢游，身后拖出涟漪 */
export class Duck {
  object = new THREE.Group()
  private angle: number
  private onWake: (p: THREE.Vector3) => void

  constructor(kit: Kit, seed: number, onWake: (p: THREE.Vector3) => void) {
    this.onWake = onWake
    this.angle = seed * 2.1
    this.object.add(kit.blob([0.24, 0.12, 0.14], seed % 2 ? 0x8b7258 : 0xe9e4da, [0, 0.07, 0]))
    this.object.add(kit.blob([0.07, 0.11, 0.06], seed % 2 ? 0x3d6b4a : 0xe9e4da, [0.17, 0.2, 0]))
    this.object.add(kit.blob([0.08, 0.075, 0.075], seed % 2 ? 0x2f6b47 : 0xf2efe8, [0.2, 0.3, 0]))
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 4), kit.matte(0xe59a3a))
    beak.rotation.z = -Math.PI / 2
    beak.position.set(0.3, 0.29, 0)
    this.object.add(beak)
    this.object.add(kit.blob([0.08, 0.04, 0.09], 0x6d5a45, [-0.2, 0.1, 0]))
  }

  private wake = 0
  update(time: number, dt: number, speed: number) {
    this.angle += dt * 0.09 * speed
    // 在下游河湾里顺水漂一段、再逆水游回来，左右换着位置
    const a = this.angle
    const t = 0.62 + 0.28 * (0.5 + 0.5 * Math.sin(a))
    const p = riverPoint(t, 0.4 * Math.sin(a * 2.3 + 1), 0.05 + Math.sin(time * 1.6 + a) * 0.012)
    this.object.position.copy(p)
    orient(this.object, riverFlow(t).multiplyScalar(Math.cos(a) >= 0 ? 1 : -1))
    this.wake += dt
    if (this.wake > 1.6) { this.wake = 0; this.onWake(p) }
  }
}

/** 湖里跃出的小鱼 */
export class Fish {
  object = new THREE.Group()
  private t = -1
  private from = new THREE.Vector3()
  private to = new THREE.Vector3()
  private onSplash: (p: THREE.Vector3) => void

  constructor(kit: Kit, onSplash: (p: THREE.Vector3) => void) {
    this.onSplash = onSplash
    this.object.add(kit.blob([0.16, 0.06, 0.04], 0xd98f4e, [0, 0, 0]))
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 4), kit.matte(0xd98f4e))
    tail.rotation.z = Math.PI / 2
    tail.position.x = -0.17
    this.object.add(tail)
    this.object.visible = false
  }

  jump() {
    const t = 0.55 + Math.random() * 0.4
    this.from.copy(riverPoint(t, (Math.random() - 0.5) * 1.1, 0.02))
    this.to.copy(this.from).addScaledVector(riverFlow(t), 0.9)
    this.t = 0
    this.object.visible = true
    this.onSplash(this.from)
  }

  update(dt: number) {
    if (this.t < 0) return
    this.t += dt
    const u = this.t / 0.9
    if (u >= 1) { this.t = -1; this.object.visible = false; this.onSplash(this.to); return }
    const p = new THREE.Vector3().lerpVectors(this.from, this.to, u)
    p.y = Math.sin(u * Math.PI) * 0.75
    this.object.position.copy(p)
    orient(this.object, this.to.clone().sub(this.from), Math.cos(u * Math.PI) * 1.1)
  }
}

/** 涟漪：水面上逐渐扩大、变淡的圆环（雨点、野鸭、跃鱼共用） */
export class Ripples {
  object = new THREE.Group()
  private rings: { mesh: THREE.Mesh; t: number; life: number; size: number }[] = []

  constructor(count: number) {
    const geometry = new THREE.RingGeometry(0.8, 1, 24)
    geometry.rotateX(-Math.PI / 2)
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }))
      mesh.visible = false
      this.object.add(mesh)
      this.rings.push({ mesh, t: -1, life: 1.6, size: 0.4 })
    }
  }

  spawn(p: THREE.Vector3, size = 0.4, life = 1.6) {
    const ring = this.rings.find(r => r.t < 0) ?? this.rings[0]!
    ring.t = 0
    ring.life = life
    ring.size = size
    ring.mesh.position.set(p.x, 0.045, p.z)
    ring.mesh.visible = true
  }

  /** 雨天：随机在湖面落下雨点 */
  rain(intensity: number, dt: number) {
    if (intensity <= 0) return
    const expected = intensity * dt * 6
    for (let k = 0; k < Math.floor(expected) + (Math.random() < expected % 1 ? 1 : 0); k++) {
      this.spawn(riverPoint(0.35 + Math.random() * 0.65, (Math.random() * 2 - 1) * 0.85, 0), 0.25, 1.1)
    }
  }

  update(dt: number) {
    for (const ring of this.rings) {
      if (ring.t < 0) continue
      ring.t += dt
      const u = ring.t / ring.life
      if (u >= 1) { ring.t = -1; ring.mesh.visible = false; continue }
      ring.mesh.scale.setScalar(ring.size * (0.2 + u * 1.6))
      ;(ring.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - u) * 0.55
    }
  }
}

/** 萤火虫：暖夜在湖边草丛里一明一灭 */
export class Fireflies {
  object = new THREE.Group()
  private flies: { sprite: THREE.Sprite; base: THREE.Vector3; phase: number }[] = []

  constructor(count: number) {
    const texture = radialTexture([[0, 'rgba(255,250,190,1)'], [0.25, 'rgba(245,240,150,0.7)'], [1, 'rgba(240,230,120,0)']], 64)
    const rand = seeded(67)
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }))
      const bank = riverPoint(0.5 + rand() * 0.5, (rand() < 0.5 ? -1 : 1) * (1.3 + rand() * 1.8))
      const base = new THREE.Vector3(bank.x, groundHeight(bank.x, bank.z) + 0.4 + rand() * 1.2, bank.z)
      sprite.scale.setScalar(0.32)
      this.object.add(sprite)
      this.flies.push({ sprite, base, phase: rand() * 20 })
    }
  }

  update(time: number) {
    for (const f of this.flies) {
      const t = time + f.phase
      f.sprite.position.set(f.base.x + Math.sin(t * 0.4) * 0.6, f.base.y + Math.sin(t * 0.7) * 0.3, f.base.z + Math.cos(t * 0.33) * 0.5)
      ;(f.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.sin(t * 1.3)) ** 2
    }
  }
}

/** 落叶 / 花瓣：从树冠里飘落，翻转着落地后淡出 */
export class FallingLeaves {
  object = new THREE.Group()
  private leaves: { mesh: THREE.Mesh; state: 'idle' | 'wait' | 'fall'; t: number; from: THREE.Vector3; drift: number; spin: number }[] = []

  constructor(count: number) {
    const geometry = new THREE.ShapeGeometry(new THREE.Shape().moveTo(0, 0).quadraticCurveTo(0.07, 0.06, 0.16, 0).quadraticCurveTo(0.07, -0.06, 0, 0))
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: 0xdca24a, side: THREE.DoubleSide, transparent: true }))
      mesh.visible = false
      mesh.castShadow = true
      this.object.add(mesh)
      this.leaves.push({ mesh, state: 'idle', t: 0, from: new THREE.Vector3(), drift: 0, spin: 0 })
    }
  }

  drop(from: THREE.Vector3, color: number, count = 3) {
    let n = 0
    for (const leaf of this.leaves) {
      if (leaf.state !== 'idle' || n >= count) continue
      leaf.state = 'wait'
      leaf.t = -n * 0.7
      leaf.from.copy(from).add(new THREE.Vector3((Math.random() - 0.5) * 2.4, Math.random() * 0.6, (Math.random() - 0.5) * 1.4))
      leaf.drift = 0.6 + Math.random() * 1.2
      leaf.spin = 2 + Math.random() * 3
      ;(leaf.mesh.material as THREE.MeshLambertMaterial).color.setHex(color)
      n++
    }
  }

  update(dt: number, wind: number) {
    for (const leaf of this.leaves) {
      if (leaf.state === 'idle') continue
      leaf.t += dt
      if (leaf.t < 0) continue
      leaf.state = 'fall'
      const ground = groundHeight(leaf.from.x, leaf.from.z) + 0.03
      const fall = leaf.t * 0.55
      const y = Math.max(ground, leaf.from.y - fall)
      const landed = y <= ground
      const x = leaf.from.x + Math.sin(leaf.t * 1.7) * 0.35 + leaf.t * (0.1 + wind) * leaf.drift
      leaf.mesh.visible = true
      leaf.mesh.position.set(x, y, leaf.from.z + Math.cos(leaf.t * 1.3) * 0.2)
      if (!landed) leaf.mesh.rotation.set(leaf.t * leaf.spin, leaf.t * 1.3, Math.sin(leaf.t * 3) * 0.8)
      else leaf.mesh.rotation.set(-Math.PI / 2, 0, leaf.mesh.rotation.z)
      const material = leaf.mesh.material as THREE.MeshLambertMaterial
      material.opacity = landed ? Math.max(0, material.opacity - dt * 0.4) : 1
      if (landed && material.opacity <= 0) { leaf.state = 'idle'; leaf.mesh.visible = false; material.opacity = 1 }
    }
  }
}

/** 烟囱炊烟：冷天与傍晚升起，随风飘斜 */
export class Smoke {
  object = new THREE.Group()
  private puffs: { sprite: THREE.Sprite; t: number }[] = []
  enabled = false
  private origin: THREE.Vector3

  /** 夜里炊烟偏暗，不在暗处发白 */
  setTint(color: number) { this.puffs.forEach(p => (p.sprite.material as THREE.SpriteMaterial).color.setHex(color)) }

  constructor(origin: THREE.Vector3) {
    this.origin = origin
    const texture = radialTexture([[0, 'rgba(235,235,235,0.9)'], [0.5, 'rgba(225,225,225,0.4)'], [1, 'rgba(220,220,220,0)']], 64)
    for (let i = 0; i < 9; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0 }))
      this.object.add(sprite)
      this.puffs.push({ sprite, t: (i / 9) * 4.5 })
    }
  }

  update(dt: number, wind: number) {
    for (const puff of this.puffs) {
      puff.t = (puff.t + dt) % 4.5
      const u = puff.t / 4.5
      puff.sprite.position.set(this.origin.x + u * (0.4 + wind * 4), this.origin.y + u * 2.4, this.origin.z)
      puff.sprite.scale.setScalar(0.35 + u * 1.1)
      ;(puff.sprite.material as THREE.SpriteMaterial).opacity = this.enabled ? Math.sin(u * Math.PI) * 0.55 : 0
    }
  }
}

/** 蜻蜓：多云时在湖面上方悬停、突然换位 */
export class Dragonfly {
  object = new THREE.Group()
  private wings: THREE.Group[] = []
  private target = new THREE.Vector3()
  private hold = 0

  constructor(kit: Kit) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.34, 5), kit.matte(0x4f8aa8))
    body.rotation.z = Math.PI / 2
    this.object.add(body)
    this.object.add(kit.blob([0.035, 0.03, 0.035], 0x3f7797, [0.18, 0, 0], [6, 4]))
    const wingMaterial = new THREE.MeshBasicMaterial({ color: 0xdfeef6, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })
    for (const [x, s] of [[0.05, 1], [0.05, -1], [-0.02, 1], [-0.02, -1]] as const) {
      const hinge = new THREE.Group()
      hinge.position.set(x, 0.01, 0)
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.22), wingMaterial)
      wing.rotation.x = -Math.PI / 2
      wing.position.z = 0.11 * s
      hinge.add(wing)
      hinge.userData.side = s
      this.wings.push(hinge)
      this.object.add(hinge)
    }
    this.object.position.copy(riverPoint(0.75, 0, 0.9))
    this.target.copy(this.object.position)
  }

  update(time: number, dt: number) {
    this.hold -= dt
    if (this.hold <= 0) {
      this.hold = 1.5 + Math.random() * 2.5
      this.target.copy(riverPoint(0.6 + Math.random() * 0.35, (Math.random() * 2 - 1) * 0.9, 0.6 + Math.random() * 0.8))
    }
    const before = this.object.position.clone()
    this.object.position.lerp(this.target, 1 - Math.exp(-dt * 3))
    this.object.position.y += Math.sin(time * 7) * 0.003
    const v = this.object.position.clone().sub(before)
    if (v.lengthSq() > 1e-6) orient(this.object, v)
    this.wings.forEach((hinge, i) => { hinge.rotation.x = Math.sin(time * 70 + i) * 0.5 * (hinge.userData.side as number) })
  }
}

