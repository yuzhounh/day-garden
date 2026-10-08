import { Solar } from 'lunar-javascript'
import type { WeatherDay } from '../types'

/** 天幕：由天气代码归并出的几类画面 */
export type SkyKind = 'clear' | 'partly' | 'overcast' | 'fog' | 'drizzle' | 'rain' | 'storm' | 'snow'
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night'
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'
export type SceneEvent = 'birds' | 'swallow' | 'meteor' | 'leaf' | 'perch' | 'rabbit' | 'hedgehog' | 'frog' | 'squirrel' | 'fish' | 'lightning'

/** 天幕里只有天象与气象；其余小事件都发生在页底花园 */
export const SKY_EVENTS: ReadonlySet<SceneEvent> = new Set<SceneEvent>(['meteor', 'lightning'])

export interface SceneState {
  sky: SkyKind
  phase: DayPhase
  season: Season
  /** 0 微风，1 和风（4–5 级），2 强风（6 级以上） */
  wind: 0 | 1 | 2
  /** 月相：0 朔 → 0.5 望 → 1 */
  moon: number
  /** 太阳或月亮离地平线的高度，0–1 */
  altitude: number
  /** 白昼进度：日出 0 → 日落 1；夜里为 null（用于 3D 花园的光照方向） */
  dayProgress: number | null
  /** 夜晚是否暖到会有萤火虫 */
  warm: boolean
  /** 是否来自真实天气（否则为中性的默认画面） */
  live: boolean
}

/** 实况超过这个时长就退回到当天的天气代码 */
const CURRENT_MAX_AGE = 3 * 60 * 60 * 1000

export function skyFromWeatherCode(code: number): SkyKind {
  if (code <= 1) return 'clear'
  if (code === 2) return 'partly'
  if (code === 3) return 'overcast'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if (code >= 95) return 'storm'
  return 'partly'
}

export function windLevel(kmh: number): 0 | 1 | 2 {
  return kmh >= 39 ? 2 : kmh >= 20 ? 1 : 0
}

function minutesOf(iso?: string): number | null {
  const match = iso?.match(/T(\d{2}):(\d{2})/)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/** 城市当地的“一天中的第几分钟”；没有偏移信息时按浏览器本地时间 */
function localMinutes(now: Date, offsetSeconds?: number): number {
  if (typeof offsetSeconds !== 'number') return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
  const minutes = now.getTime() / 60000 + offsetSeconds / 60
  return ((minutes % 1440) + 1440) % 1440
}

export function dayPhase(now: Date, weather?: WeatherDay | null): { phase: DayPhase; altitude: number; progress: number | null } {
  const hasSun = typeof weather?.utcOffsetSeconds === 'number'
  const sunrise = (hasSun ? minutesOf(weather?.sunrise) : null) ?? 6 * 60
  const sunset = (hasSun ? minutesOf(weather?.sunset) : null) ?? 18 * 60
  const t = localMinutes(now, hasSun ? weather?.utcOffsetSeconds : undefined)
  const dayLength = Math.max(60, sunset - sunrise)

  let phase: DayPhase
  if (t < sunrise - 30 || t >= sunset + 30) phase = 'night'
  else if (t < sunrise + 45) phase = 'dawn'
  else if (t < sunset - 45) phase = 'day'
  else phase = 'dusk'

  let altitude: number
  let progress: number | null = null
  if (t >= sunrise && t <= sunset) {
    progress = (t - sunrise) / dayLength
    altitude = Math.sin(Math.PI * progress)
  } else {
    const nightLength = 1440 - dayLength
    const sinceSunset = (t - sunset + 1440) % 1440
    altitude = Math.sin(Math.PI * Math.min(1, sinceSunset / nightLength))
  }
  return { phase, altitude: Math.max(0, Math.min(1, altitude)), progress }
}

export function seasonOf(date: Date, lat = 30): Season {
  const seasons: Season[] = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']
  const month = (date.getMonth() + (lat < 0 ? 6 : 0)) % 12
  return seasons[month]!
}

/** 由农历日推算月相，初一为朔、十五前后为望 */
export function moonPhase(date: Date): number {
  try {
    const lunarDay = Solar.fromDate(date).getLunar().getDay()
    return Math.max(0, Math.min(1, (lunarDay - 0.5) / 29.53))
  } catch {
    return 0.5
  }
}

export function deriveScene(now: Date, weather: WeatherDay | null | undefined, lat = 30): SceneState {
  const live = Boolean(weather && weather.dataSource !== 'demo')
  const current = live && weather?.current && Date.now() - weather.current.fetchedAt < CURRENT_MAX_AGE ? weather.current : undefined
  const sky: SkyKind = live ? skyFromWeatherCode(current?.weatherCode ?? weather!.weatherCode) : 'partly'
  const baseWind = current ? windLevel(current.windSpeed) : 0
  const wind = (sky === 'storm' ? Math.max(baseWind, 1) : baseWind) as 0 | 1 | 2
  const { phase, altitude, progress } = dayPhase(now, live ? weather : null)
  const season = seasonOf(now, lat)
  const wet = sky === 'drizzle' || sky === 'rain' || sky === 'storm' || sky === 'snow'
  const warm = season !== 'winter' && !wet && (live ? weather!.tempMax >= 20 : season === 'summer')
  return { sky, phase, season, wind, moon: moonPhase(now), altitude, dayProgress: progress, warm, live }
}

export const SCENE_EVENT_DURATION: Record<SceneEvent, number> = {
  birds: 18000,
  swallow: 7000,
  meteor: 1800,
  leaf: 10000,
  perch: 2600,
  rabbit: 11000,
  hedgehog: 24000,
  frog: 2400,
  squirrel: 7000,
  fish: 2000,
  lightning: 900,
}

/** 当前画面里说得通的偶发小事件 */
export function sceneEventsFor(state: SceneState): SceneEvent[] {
  const { sky, phase, season, wind } = state
  const lit = phase !== 'night'
  const wet = sky === 'drizzle' || sky === 'rain' || sky === 'storm'
  const events: SceneEvent[] = []
  if (lit && (sky === 'clear' || sky === 'partly' || sky === 'overcast') && wind < 2) events.push('birds')
  if (lit && (sky === 'drizzle' || sky === 'rain')) events.push('swallow')
  if (!lit && (sky === 'clear' || sky === 'partly')) events.push('meteor')
  if (season === 'autumn' || season === 'spring' || wind > 0) events.push('leaf')
  if (lit && !wet && wind < 2) events.push('perch')
  if (lit && !wet) events.push('rabbit', 'squirrel')
  if ((phase === 'night' || phase === 'dusk') && !wet && sky !== 'snow') events.push('hedgehog')
  if (sky === 'drizzle' || sky === 'rain') events.push('frog')
  if (season !== 'winter' && sky !== 'storm' && sky !== 'snow') events.push('fish')
  if (sky === 'storm') events.push('lightning', 'lightning')
  return events
}

export function pickSceneEvent(state: SceneState, random: () => number = Math.random): SceneEvent | null {
  const events = sceneEventsFor(state)
  return events.length ? events[Math.floor(random() * events.length)]! : null
}
