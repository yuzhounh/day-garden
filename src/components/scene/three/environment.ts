import type { DayPhase, SceneState, Season, SkyKind } from '../../../services/scene'

/**
 * 3D 天气画卷的“环境参数”：配色、光照、相机取景与云量。
 * 纯函数、不依赖 three.js，便于单元测试。
 */

export interface GardenPalette {
  ground: number
  groundAlt: number
  grass: number[]
  /** 落叶乔木树冠；冬天为 null（只剩枝桠） */
  canopy: number[] | null
  /** 树冠上的点缀：春天的花、秋天的柿子 */
  accent: number | null
  flowers: number[]
  pine: [number, number]
  hill: number
  mountainNear: number
  mountainFar: number
  /** 山顶积雪线（相对山高的比例，越小积雪越多） */
  snowLine: number
  lake: number
  shore: number
}

const PALETTES: Record<Season, GardenPalette> = {
  spring: {
    ground: 0xa6cd8a, groundAlt: 0x93c07b, grass: [0x9fcf83, 0x86bd70, 0xb3da98],
    canopy: [0xefb9c9, 0xf5ccd8, 0xe6a6ba], accent: 0xfff3f6, flowers: [0xffffff, 0xf0a3bd, 0xf2d06b],
    pine: [0x5f9468, 0x4f8058], hill: 0x9cc58a, mountainNear: 0x9fb8a6, mountainFar: 0xb4c4cc, snowLine: 0.8, lake: 0x8fc0d6, shore: 0xd8cfae,
  },
  summer: {
    ground: 0x8fc076, groundAlt: 0x7cb266, grass: [0x86bd6f, 0x6fab5d, 0x9acb83],
    canopy: [0x5f9e58, 0x4f8c4b, 0x76b267], accent: null, flowers: [0xffffff, 0xf2c94c, 0xe98aa8],
    pine: [0x56885e, 0x47744f], hill: 0x86b874, mountainNear: 0x91ad98, mountainFar: 0xaabcc6, snowLine: 0.92, lake: 0x7fb8d4, shore: 0xd6cba5,
  },
  autumn: {
    ground: 0xbcc07c, groundAlt: 0xa9b26d, grass: [0xb4bf7a, 0xc9c17a, 0x9fb46f],
    canopy: [0xe2a24a, 0xcf7a3b, 0xefc469], accent: 0xe8792f, flowers: [0xe9ad3f, 0xd8853a, 0xf3e6c4],
    pine: [0x5b8a62, 0x4b7654], hill: 0xb7b778, mountainNear: 0xa7ad94, mountainFar: 0xbac2c4, snowLine: 0.78, lake: 0x8ab5c8, shore: 0xd9cba3,
  },
  winter: {
    ground: 0xc4ceba, groundAlt: 0xb4c0aa, grass: [0xaab89f, 0xbab595, 0x9bab92],
    canopy: null, accent: 0xc94a3e, flowers: [0xc94a3e],
    pine: [0x55836a, 0x46705a], hill: 0xb9c4b4, mountainNear: 0xb4bec0, mountainFar: 0xc9d2d8, snowLine: 0.5, lake: 0xa9c8d6, shore: 0xd2ccbc,
  },
}

/** 雪天：地面与远山都覆盖白雪 */
export function gardenPalette(season: Season, snowy: boolean): GardenPalette {
  const base = PALETTES[season]
  if (!snowy) return base
  return { ...base, ground: 0xf1f4f6, groundAlt: 0xe4eaee, grass: [0xdfe6e3, 0xcfd9d2, 0xb9c7bc], hill: 0xe8edf0, snowLine: 0.3, flowers: [] }
}

export interface Lighting {
  /** 光源方向（指向光源），已归一化 */
  sunDir: [number, number, number]
  sunColor: number
  sunIntensity: number
  hemiSky: number
  hemiGround: number
  hemiIntensity: number
  night: boolean
}

const SKY_LIGHT: Record<SkyKind, { sun: number; hemi: number; hemiSky: number }> = {
  clear: { sun: 2.6, hemi: 1.35, hemiSky: 0xdcecff },
  partly: { sun: 2.0, hemi: 1.5, hemiSky: 0xdde9f5 },
  overcast: { sun: 0.85, hemi: 2.0, hemiSky: 0xe4e9ee },
  fog: { sun: 0.7, hemi: 2.1, hemiSky: 0xe8ecef },
  drizzle: { sun: 0.7, hemi: 1.75, hemiSky: 0xcfd8e0 },
  rain: { sun: 0.55, hemi: 1.6, hemiSky: 0xc4ced8 },
  storm: { sun: 0.35, hemi: 1.2, hemiSky: 0x9ea9b8 },
  snow: { sun: 1.0, hemi: 2.0, hemiSky: 0xe8eef8 },
}

const normalize = (v: [number, number, number]): [number, number, number] => {
  const len = Math.hypot(...v) || 1
  return [v[0] / len, v[1] / len, v[2] / len]
}

/** 光照随天气、昼夜与主题变化；太阳从左（东）升起、向右（西）落下 */
export function lighting(state: Pick<SceneState, 'sky' | 'phase' | 'dayProgress'>, dark: boolean): Lighting {
  const theme = dark ? 0.78 : 1
  if (state.phase === 'night') {
    return { sunDir: normalize([0.5, 0.9, 0.55]), sunColor: 0x9fb2ff, sunIntensity: 0.55 * theme, hemiSky: 0x34415f, hemiGround: 0x141a16, hemiIntensity: 0.85 * theme, night: true }
  }
  const sky = SKY_LIGHT[state.sky]
  const p = state.dayProgress ?? 0.5
  const low = state.phase === 'dawn' || state.phase === 'dusk'
  const sunDir = normalize([-Math.cos(Math.PI * p), Math.max(0.18, Math.sin(Math.PI * p)) * 1.3, 0.75])
  return {
    sunDir,
    sunColor: low ? 0xffc08a : 0xfff3e2,
    sunIntensity: sky.sun * (low ? 0.8 : 1) * theme,
    hemiSky: low ? 0xffd9c4 : sky.hemiSky,
    hemiGround: 0xb5c4a2,
    hemiIntensity: sky.hemi * (low ? 0.85 : 1) * theme,
    night: false,
  }
}

export interface CameraRig { position: [number, number, number]; target: [number, number, number]; fov: number }

/** 花园取景：宽屏铺开全景，窄屏把湖、小屋与大树收在画面里 */
export function gardenRig(aspect: number): CameraRig {
  const fov = 26
  const tanHalf = Math.tan(((fov / 2) * Math.PI) / 180)
  const wide = aspect >= 2.6
  const halfWidth = wide ? Math.min(24, 10 + aspect * 3) : 11.5
  const centerX = wide ? 0 : 1.5
  const distance = halfWidth / (Math.max(aspect, 0.8) * tanHalf)
  const height = 3.2 + distance * 0.08
  return { position: [centerX, height, distance], target: [centerX, 2.6, -20], fov }
}

export interface CloudPlan { count: number; shade: number; scale: [number, number]; opacity: number; band: [number, number] }

/** 云量：count 为宽屏时的数量，shade 为云的颜色 */
export const CLOUD_PLAN: Record<SkyKind, CloudPlan> = {
  clear: { count: 2, shade: 0xffffff, scale: [0.7, 1.0], opacity: 0.85, band: [0.62, 0.95] },
  partly: { count: 5, shade: 0xffffff, scale: [0.8, 1.3], opacity: 0.95, band: [0.5, 0.97] },
  overcast: { count: 9, shade: 0xd9dee5, scale: [1.2, 1.9], opacity: 0.97, band: [0.45, 1.0] },
  fog: { count: 3, shade: 0xe6e9ec, scale: [1.2, 1.6], opacity: 0.6, band: [0.55, 1.0] },
  drizzle: { count: 8, shade: 0xc9d0d8, scale: [1.1, 1.8], opacity: 0.97, band: [0.45, 1.0] },
  rain: { count: 9, shade: 0xb4bcc6, scale: [1.2, 2.0], opacity: 0.95, band: [0.48, 1.0] },
  storm: { count: 10, shade: 0x9ba4b1, scale: [1.4, 2.2], opacity: 0.9, band: [0.5, 1.0] },
  snow: { count: 8, shade: 0xdde3ea, scale: [1.1, 1.8], opacity: 0.97, band: [0.45, 1.0] },
}

export function phaseTint(phase: DayPhase): number {
  return phase === 'dawn' ? 0xffd2c0 : phase === 'dusk' ? 0xffc29c : phase === 'night' ? 0x8090b8 : 0xffffff
}
