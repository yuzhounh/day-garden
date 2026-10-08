export interface Box { x: number; y: number; w: number; h: number }
export interface Point { x: number; y: number }

/** 画卷所需的页面骨架，坐标均相对于 .garden-app 左上角 */
export interface SceneLayout {
  width: number
  height: number
  shellLeft: number
  shellRight: number
  hero: Box
  /** 问候语、副标题实际文字的最右端 */
  textRight: number
  dateCard: Box | null
  /** 卡片区的上沿：天幕在这里之前渐隐 */
  contentTop: number
  /** 页底花园的高度（与 .garden-app 底部留白对应） */
  gardenHeight: number
}

export interface SunAnchor { x: number; top: number; travel: number; r: number }

/** 固定种子的伪随机数，保证同一画面每次渲染位置一致 */
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

const r1 = (v: number) => Math.round(v * 10) / 10

/** 问候语与日期卡片并排；窄屏时日期卡片换到问候语下方 */
export function isWrapped(l: SceneLayout): boolean {
  return !l.dateCard || l.dateCard.x < l.shellLeft + 40
}

/** 太阳/月亮的落点：宽屏在问候语与日期卡片之间的留白里，窄屏在右上角 */
export function sunAnchor(l: SceneLayout): SunAnchor {
  if (isWrapped(l) || !l.dateCard) return { x: l.shellRight - 26, top: l.hero.y + 36, travel: 12, r: 15 }
  const left = l.textRight + 28
  const right = l.dateCard.x - 24
  const x = right - left >= 64 ? (left + right) / 2 : l.dateCard.x - 32
  return { x, top: l.hero.y + 40, travel: 48, r: 24 }
}

/** 叶片：沿 +x 方向、长 s 的柳叶形 */
export function leafPath(s: number): string {
  return `M0 0C${r1(s * 0.3)} ${r1(-s * 0.34)} ${r1(s * 0.78)} ${r1(-s * 0.3)} ${r1(s)} 0C${r1(s * 0.78)} ${r1(s * 0.3)} ${r1(s * 0.3)} ${r1(s * 0.34)} 0 0Z`
}

/** 大树插画（170×170，树根在底边中点）中侧枝上的落脚点 */
export const OAK_SIZE = 170
export const SAPLING_SCALE = 0.58
export const OAK_PERCH = { x: 46, y: 107 }
export const PINE_SIZE = { w: 80, h: 130 }

export interface GardenLayout {
  /** 地平线 */
  ridge: number
  /** 树木缩放：手机上略小 */
  scale: number
  narrow: boolean
  /** 四季变化的大树（落叶乔木）与常青松，x 为树根位置，base 为树根所在高度 */
  oak: { x: number; base: number }
  /** 900px 以上的宽屏在花园中段再种一棵小树（同一树种，约六成大小） */
  sapling: { x: number; base: number } | null
  pine: { x: number; base: number }
  /** 大树侧枝上小鸟或猫头鹰的落脚点（花园坐标） */
  perch: Point
  fence: { x: number; w: number }
  /** 栅栏边的高秆植物：春郁金香、夏向日葵、秋芒草、冬枯茎 */
  tall: number[]
  shrubs: number[]
  /** 雨天的水洼（半径随屏宽收小）与守在水边的青蛙 */
  puddle: Point & { rx: number }
  frogX: number
}

/**
 * 页底花园的布局：左侧一棵松，左中一段木栅栏，右侧一棵大树；
 * 灌木与水洼穿插其间，彼此不重叠。
 */
export function gardenLayout(width: number, height: number): GardenLayout {
  const narrow = width < 600
  const scale = narrow ? 0.78 : 1
  const ridge = height - 46
  const base = ridge + 4
  const oak = { x: Math.round(width * (narrow ? 0.78 : 0.8)), base }
  const pine = { x: Math.round(width * 0.1), base }
  const fence = { x: Math.round(width * 0.3), w: narrow ? 52 : 76 }
  const tallStart = fence.x + fence.w + (narrow ? 8 : 12)
  const tall = (narrow ? [0, 12] : [0, 14, 27]).map(dx => tallStart + dx)
  const shrubs = (narrow ? [0.2] : [0.2, 0.7, 0.93]).map(t => Math.round(width * t))
  // 手机上栅栏、高秆植物、水洼与大树挨得近：水洼靠右且收小，青蛙蹲在水洼右边
  const puddle = { x: Math.round(width * (narrow ? 0.6 : 0.52)), y: ridge + 13, rx: narrow ? 22 : 32 }
  return {
    ridge,
    scale,
    narrow,
    oak,
    sapling: width >= 900 ? { x: Math.round(width * 0.61), base } : null,
    pine,
    perch: { x: oak.x + (OAK_PERCH.x - OAK_SIZE / 2) * scale, y: base + (OAK_PERCH.y - OAK_SIZE) * scale },
    fence,
    tall,
    shrubs,
    puddle,
    frogX: narrow ? puddle.x + puddle.rx + 6 : puddle.x - puddle.rx - 24,
  }
}
