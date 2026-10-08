import type { HourlyWeather, WeatherDay } from '../types'

/**
 * 天气详情：分时预报、实况指标与出行建议。
 * 出行建议与常见天气 App 的“生活指数”一样，由气象数据按固定规则推算，结果可解释、无需联网调用 AI。
 */

/** 蒲福风级：各级下限（km/h） */
const BEAUFORT_KMH = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118]
export function beaufort(kmh: number): number {
  let level = 0
  for (const threshold of BEAUFORT_KMH) if (kmh >= threshold) level++
  return level
}

const DIRECTIONS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北']
/** 风向按“风的来向”命名，如 135° 为东南风 */
export function windDirectionName(deg?: number | null, kmh?: number | null): string {
  if (kmh !== undefined && kmh !== null && kmh < 1) return '静风'
  if (deg === undefined || deg === null || !Number.isFinite(deg)) return '风向不定'
  return DIRECTIONS[Math.round((((deg % 360) + 360) % 360) / 45) % 8] + '风'
}

export function uvLevel(value?: number | null): string {
  if (value === undefined || value === null) return '暂无数据'
  return value <= 2 ? '低' : value <= 5 ? '中等' : value <= 7 ? '高' : value <= 10 ? '很高' : '极高'
}
export function humidityLevel(value: number): string {
  return value < 30 ? '干燥' : value < 40 ? '略干' : value <= 70 ? '舒适' : value <= 85 ? '潮湿' : '闷湿'
}
export function feelsLevel(value: number): string {
  return value < 0 ? '寒冷' : value < 10 ? '冷' : value < 18 ? '凉爽' : value <= 26 ? '舒适' : value <= 32 ? '炎热' : '酷热'
}

const pad = (n: number) => String(n).padStart(2, '0')
/** 城市当地的“现在”，格式 YYYY-MM-DDTHH:MM；没有时区偏移时按浏览器本地时间 */
export function cityNow(offsetSeconds?: number, now: Date = new Date()): string {
  if (typeof offsetSeconds !== 'number') {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  }
  return new Date(now.getTime() + offsetSeconds * 1000).toISOString().slice(0, 16)
}
const hhmm = (iso?: string) => (iso ? iso.slice(11, 16) : '')
const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)

export interface DayMetrics {
  /** 今天且有新鲜实况：指标显示“现在”的数值 */
  live: boolean
  uv: number | null
  uvMax: number | null
  humidity: number | null
  apparent: number | null
  apparentMax: number
  apparentMin: number
  windSpeed: number | null
  windDir: number | null
  windLevel: number
  windName: string
  pressure: number | null
  pressureTrend: 'up' | 'down' | 'steady' | null
  /** 日出日落：今天日落后显示明日日出 */
  sunLabel: '日落' | '日出' | '明日日出'
  sunTime: string
  sunrise: string
  sunset: string
  /** 今天白昼进度 0–1（日出前、日落后为 null） */
  sunProgress: number | null
}

const CURRENT_MAX_AGE = 3 * 60 * 60 * 1000

function hourAt(day: WeatherDay, nowIso: string): HourlyWeather | undefined {
  return day.hours?.find(h => h.time.slice(0, 13) === nowIso.slice(0, 13))
}

export function dayMetrics(day: WeatherDay, nowIso: string, nextDay?: WeatherDay): DayMetrics {
  const hours = day.hours ?? []
  const current = day.isToday && day.current && Date.now() - day.current.fetchedAt < CURRENT_MAX_AGE ? day.current : undefined
  const nowHour = day.isToday ? hourAt(day, nowIso) : undefined
  const live = Boolean(day.isToday && (current || nowHour))

  const uvMax = day.uvIndex ?? (hours.length ? Math.round(Math.max(...hours.map(h => h.uv))) : null)
  const uv = live ? Math.round(current?.uv ?? nowHour?.uv ?? 0) : uvMax
  const humidity = live ? (current?.humidity ?? nowHour?.humidity ?? null) : mean(hours.map(h => h.humidity))
  const apparent = live ? (current?.apparent ?? nowHour?.apparent ?? null) : day.apparentTempMax
  const windSpeed = live ? (current?.windSpeed ?? nowHour?.windSpeed ?? null) : (day.windSpeedMax ?? (hours.length ? Math.max(...hours.map(h => h.windSpeed)) : null))
  const windDir = live ? (current?.windDir ?? nowHour?.windDir ?? null) : (day.windDirDominant ?? null)
  const pressure = live ? (current?.pressure ?? nowHour?.pressure ?? null) : mean(hours.map(h => h.pressure))

  let pressureTrend: DayMetrics['pressureTrend'] = null
  if (hours.length >= 2) {
    const startIdx = live && nowHour ? hours.indexOf(nowHour) : 0
    const later = live ? hours[Math.min(hours.length - 1, startIdx + 3)] : hours[hours.length - 1]
    const from = live ? (pressure ?? hours[startIdx]!.pressure) : hours[0]!.pressure
    const diff = (later?.pressure ?? from) - from
    pressureTrend = diff >= (live ? 1 : 2) ? 'up' : diff <= -(live ? 1 : 2) ? 'down' : 'steady'
  }

  const sunrise = hhmm(day.sunrise)
  const sunset = hhmm(day.sunset)
  const now = nowIso.slice(0, 16)
  let sunLabel: DayMetrics['sunLabel'] = '日落'
  let sunTime = sunset
  let sunProgress: number | null = null
  if (day.isToday && day.sunrise && day.sunset) {
    const toMin = (iso: string) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16))
    const t = toMin(now)
    const rise = toMin(day.sunrise)
    const set = toMin(day.sunset)
    if (t < rise) { sunLabel = '日出'; sunTime = sunrise }
    else if (t > set) { sunLabel = '明日日出'; sunTime = hhmm(nextDay?.sunrise) || sunrise }
    else sunProgress = (t - rise) / Math.max(1, set - rise)
  }

  return {
    live,
    uv: uv === null ? null : Math.round(uv),
    uvMax,
    humidity: humidity === null ? null : Math.round(humidity),
    apparent: apparent === null ? null : Math.round(apparent),
    apparentMax: day.apparentTempMax,
    apparentMin: day.apparentTempMin,
    windSpeed,
    windDir,
    windLevel: windSpeed === null ? 0 : beaufort(windSpeed),
    windName: windDirectionName(windDir, windSpeed),
    pressure: pressure === null ? null : Math.round(pressure),
    pressureTrend,
    sunLabel,
    sunTime,
    sunrise,
    sunset,
    sunProgress,
  }
}

export interface HourCell extends HourlyWeather {
  label: string
  isNow: boolean
  windLevel: number
}

/** 分时预报：今天从当前整点起往后 24 小时（可跨到次日），其他日子为当天 0–23 时 */
export function hourlyStrip(days: WeatherDay[], day: WeatherDay, nowIso: string): HourCell[] {
  let hours: HourlyWeather[]
  let nowKey = ''
  if (day.isToday) {
    const all = days.flatMap(d => d.hours ?? [])
    nowKey = nowIso.slice(0, 13)
    const start = all.findIndex(h => h.time.slice(0, 13) === nowKey)
    hours = start >= 0 ? all.slice(start, start + 24) : (day.hours ?? [])
  } else {
    hours = day.hours ?? []
  }
  return hours.map((h, i) => {
    const isNow = h.time.slice(0, 13) === nowKey
    const clock = h.time.slice(11, 16)
    const label = isNow ? '现在' : clock === '00:00' && i > 0 ? '明日' : clock
    return { ...h, label, isNow, windLevel: beaufort(h.windSpeed) }
  })
}

export interface PrecipOutlook { title: string; hint: string; wet: boolean }

/** 降水预报：今天看未来两小时（15 分钟间隔），其他日子看全天 */
export function precipOutlook(day: WeatherDay, nowIso: string): PrecipOutlook {
  const sum = day.precipSum ?? 0
  if (day.isPast) {
    return sum >= 0.1
      ? { title: `全天累计降水 ${sum} mm`, hint: '历史数据，供回顾参考', wet: true }
      : { title: '当天无明显降水', hint: '历史数据，供回顾参考', wet: false }
  }
  if (day.isToday) {
    const minute = Number(nowIso.slice(14, 16))
    const floor = `${nowIso.slice(0, 14)}${pad(minute - (minute % 15))}`
    const steps = (day.nowcast ?? []).filter(s => s.time.slice(0, 16) >= floor)
    const wet = (mm: number) => mm >= 0.1
    if (steps.length >= 4) {
      const firstWet = steps.findIndex(s => wet(s.precip))
      if (firstWet === -1) return { title: '两小时内无降水', hint: '放心出行吧', wet: false }
      if (firstWet === 0) {
        const dry = steps.find(s => !wet(s.precip))
        return { title: '正在降水', hint: dry ? `预计 ${hhmm(dry.time)} 前后停歇` : '未来两小时仍有降水，记得带伞', wet: true }
      }
      return { title: `${hhmm(steps[firstWet]!.time)} 前后可能开始降水`, hint: '出门记得带伞', wet: true }
    }
    const nowKey = nowIso.slice(0, 13)
    const next = (day.hours ?? []).filter(h => h.time.slice(0, 13) >= nowKey).slice(0, 3)
    if (next.length) {
      const prob = Math.max(...next.map(h => h.precipProb))
      if (prob >= 50) return { title: '两小时内可能降水', hint: `降水概率 ${prob}%，记得带伞`, wet: true }
      if (prob >= 20) return { title: '两小时内降水概率较低', hint: `降水概率 ${prob}%`, wet: false }
      return { title: '两小时内无明显降水', hint: '放心出行吧', wet: false }
    }
  }
  if (day.precipProb < 20 && sum < 0.1) return { title: '全天无明显降水', hint: `降水概率 ${day.precipProb}%`, wet: false }
  const rainy = (day.hours ?? []).filter(h => h.precipProb >= 50)
  const window = rainy.length ? `${hhmm(rainy[0]!.time)}–${hhmm(rainy[rainy.length - 1]!.time)} 较可能降水` : ''
  const amount = sum >= 0.1 ? `预计累计 ${sum} mm` : '雨量很小'
  return { title: `全天降水概率 ${day.precipProb}%`, hint: [window, amount].filter(Boolean).join('，'), wet: true }
}

export type AdviceKey = 'dress' | 'sun' | 'sport' | 'cycle' | 'umbrella' | 'cold'
export interface Advice { key: AdviceKey; title: string; label: string; detail: string; tone: 'good' | 'mind' | 'warn' }

const SLIPPERY_CODES = new Set([56, 57, 66, 67, 71, 73, 75, 77, 85, 86])

/** 出行建议：穿衣、防晒、户外运动、骑行、带伞、感冒 */
export function lifeAdvice(day: WeatherDay, prev?: WeatherDay): Advice[] {
  const hours = day.hours ?? []
  const prob = day.precipProb
  const sum = day.precipSum ?? 0
  const uvMax = day.uvIndex ?? (hours.length ? Math.round(Math.max(...hours.map(h => h.uv))) : null)
  const windMax = day.windSpeedMax ?? (hours.length ? Math.max(...hours.map(h => h.windSpeed)) : 0)
  const wind = beaufort(windMax)
  const range = day.tempMax - day.tempMin
  const storm = day.weatherCode >= 95
  const humidity = mean(hours.map(h => h.humidity))

  const feels = (day.apparentTempMax * 2 + day.apparentTempMin) / 3
  const swing = range >= 10 ? '；昼夜温差大，早晚加衣' : ''
  const dress: Advice =
    feels >= 28 ? { key: 'dress', title: '穿衣', label: '适宜短袖', detail: '短袖、短裙等清凉透气的衣物' + swing, tone: 'good' }
    : feels >= 23 ? { key: 'dress', title: '穿衣', label: '短袖或薄长袖', detail: '早晚可加一件薄衫' + swing, tone: 'good' }
    : feels >= 18 ? { key: 'dress', title: '穿衣', label: '适宜长袖', detail: '长袖衬衫、卫衣或薄外套' + swing, tone: 'good' }
    : feels >= 12 ? { key: 'dress', title: '穿衣', label: '适宜外套', detail: '夹克、风衣或薄毛衣' + swing, tone: 'mind' }
    : feels >= 5 ? { key: 'dress', title: '穿衣', label: '注意保暖', detail: '毛衣、大衣，早晚再加一层', tone: 'mind' }
    : feels >= -5 ? { key: 'dress', title: '穿衣', label: '穿厚外套', detail: '棉服或厚大衣，戴好围巾', tone: 'warn' }
    : { key: 'dress', title: '穿衣', label: '穿羽绒服', detail: '羽绒服加帽子手套，注意防寒', tone: 'warn' }

  const sun: Advice =
    uvMax === null ? { key: 'sun', title: '防晒', label: '防晒', detail: '暂无紫外线数据', tone: 'mind' }
    : uvMax <= 2 ? { key: 'sun', title: '防晒', label: '无需防晒', detail: '紫外线弱', tone: 'good' }
    : uvMax <= 5 ? { key: 'sun', title: '防晒', label: '适当防晒', detail: 'SPF15 以上，正午注意遮挡', tone: 'mind' }
    : uvMax <= 7 ? { key: 'sun', title: '防晒', label: '注意防晒', detail: 'SPF30 以上，戴帽子或打遮阳伞', tone: 'mind' }
    : { key: 'sun', title: '防晒', label: '加强防晒', detail: 'SPF50，避免正午长时间外出', tone: 'warn' }

  const sport: Advice =
    storm ? { key: 'sport', title: '运动', label: '不宜户外运动', detail: '有雷暴，选择室内运动', tone: 'warn' }
    : prob >= 60 || sum >= 2 ? { key: 'sport', title: '运动', label: '不宜户外运动', detail: '有雨，室内运动更合适', tone: 'warn' }
    : wind >= 6 ? { key: 'sport', title: '运动', label: '不宜户外运动', detail: `${wind} 级大风`, tone: 'warn' }
    : day.apparentTempMax >= 35 ? { key: 'sport', title: '运动', label: '谨慎户外运动', detail: '高温，避开午后，及时补水', tone: 'mind' }
    : day.apparentTempMin <= -10 ? { key: 'sport', title: '运动', label: '谨慎户外运动', detail: '严寒，充分热身、注意保暖', tone: 'mind' }
    : prob >= 30 ? { key: 'sport', title: '运动', label: '较宜户外运动', detail: '可能有雨，备好雨具', tone: 'mind' }
    : { key: 'sport', title: '运动', label: '宜户外运动', detail: day.apparentTempMax >= 28 ? '早晚更凉爽' : '天气不错，出去走走吧', tone: 'good' }

  const cycle: Advice =
    SLIPPERY_CODES.has(day.weatherCode) || (day.tempMin <= 0 && sum > 0) ? { key: 'cycle', title: '骑行', label: '不宜骑行', detail: '路面湿滑或结冰', tone: 'warn' }
    : prob >= 50 || sum >= 1 ? { key: 'cycle', title: '骑行', label: '不宜骑行', detail: '有雨路滑，视线差', tone: 'warn' }
    : wind >= 5 ? { key: 'cycle', title: '骑行', label: '不宜骑行', detail: `${wind} 级风，逆风吃力`, tone: 'warn' }
    : wind === 4 ? { key: 'cycle', title: '骑行', label: '较宜骑行', detail: '风稍大，留意侧风', tone: 'mind' }
    : prob >= 30 ? { key: 'cycle', title: '骑行', label: '较宜骑行', detail: '可能有雨，备好雨衣', tone: 'mind' }
    : day.apparentTempMax >= 35 ? { key: 'cycle', title: '骑行', label: '较宜骑行', detail: '高温，避开午后', tone: 'mind' }
    : { key: 'cycle', title: '骑行', label: '适宜骑行', detail: '风小路干，骑车正好', tone: 'good' }

  const umbrella: Advice =
    prob >= 50 || sum >= 1 ? { key: 'umbrella', title: '雨具', label: '需要带伞', detail: sum >= 0.1 ? `预计降水 ${sum} mm` : `降水概率 ${prob}%`, tone: 'warn' }
    : prob >= 25 ? { key: 'umbrella', title: '雨具', label: '建议备伞', detail: `降水概率 ${prob}%`, tone: 'mind' }
    : uvMax !== null && uvMax >= 8 ? { key: 'umbrella', title: '雨具', label: '可带遮阳伞', detail: '无雨但紫外线强', tone: 'mind' }
    : { key: 'umbrella', title: '雨具', label: '不用带伞', detail: `降水概率 ${prob}%`, tone: 'good' }

  // 感冒：昼夜温差、较前一天的冷暖变化、空气干湿与低温共同决定
  const reasons: string[] = []
  let score = 0
  if (range >= 12) { score += 2; reasons.push(`昼夜温差 ${range}°`) } else if (range >= 8) { score += 1; reasons.push(`昼夜温差 ${range}°`) }
  if (prev) {
    const delta = (day.tempMax + day.tempMin) / 2 - (prev.tempMax + prev.tempMin) / 2
    const size = Math.round(Math.abs(delta))
    if (size >= 6) { score += 2; reasons.push(`较前一天${delta < 0 ? '降温' : '升温'} ${size}°`) } else if (size >= 4) { score += 1; reasons.push(`较前一天${delta < 0 ? '降温' : '升温'} ${size}°`) }
  }
  if (humidity !== null && humidity < 30) { score += 1; reasons.push('空气干燥') }
  if (day.tempMin <= 5) { score += 1; reasons.push('气温偏低') }
  if ((prob >= 50 || sum >= 1) && wind >= 4) { score += 1; reasons.push('风雨交加') }
  const why = reasons.slice(0, 2).join('，')
  const cold: Advice =
    score >= 4 ? { key: 'cold', title: '感冒', label: '极易感冒', detail: `${why}，注意增减衣物`, tone: 'warn' }
    : score === 3 ? { key: 'cold', title: '感冒', label: '易感冒', detail: `${why}，注意增减衣物`, tone: 'warn' }
    : score === 2 ? { key: 'cold', title: '感冒', label: '较易感冒', detail: why || '注意适时增减衣物', tone: 'mind' }
    : { key: 'cold', title: '感冒', label: '感冒少发', detail: why || '天气平稳', tone: 'good' }

  return [dress, sun, sport, cycle, umbrella, cold]
}
