import type { CityOption, HourlyWeather, WeatherDay } from '../types'
import { localDateKey } from './day'

export const DEFAULT_CITIES: CityOption[] = [
  { name: '北京', province: '北京', lat: 39.9042, lon: 116.4074 },
  { name: '上海', province: '上海', lat: 31.2304, lon: 121.4737 },
  { name: '广州', province: '广东', lat: 23.1291, lon: 113.2644 },
  { name: '深圳', province: '广东', lat: 22.5431, lon: 114.0579 },
  { name: '杭州', province: '浙江', lat: 30.2741, lon: 120.1551 },
  { name: '成都', province: '四川', lat: 30.5728, lon: 104.0668 },
  { name: '重庆', province: '重庆', lat: 29.5630, lon: 106.5516 },
  { name: '武汉', province: '湖北', lat: 30.5928, lon: 114.3055 },
  { name: '西安', province: '陕西', lat: 34.3416, lon: 108.9398 },
  { name: '南京', province: '江苏', lat: 32.0603, lon: 118.7969 },
  { name: '苏州', province: '江苏', lat: 31.2990, lon: 120.5853 },
  { name: '天津', province: '天津', lat: 39.0842, lon: 117.2009 },
  { name: '长沙', province: '湖南', lat: 28.2282, lon: 112.9388 },
  { name: '郑州', province: '河南', lat: 34.7570, lon: 113.6654 },
  { name: '青岛', province: '山东', lat: 36.0671, lon: 120.3826 },
  { name: '厦门', province: '福建', lat: 24.4798, lon: 118.0894 },
  { name: '昆明', province: '云南', lat: 25.0406, lon: 102.7123 },
  { name: '三亚', province: '海南', lat: 18.2528, lon: 109.5119 },
  { name: '大理', province: '云南', lat: 25.6065, lon: 100.2676 },
  { name: '桂林', province: '广西', lat: 25.2736, lon: 110.2902 },
  { name: '拉萨', province: '西藏', lat: 29.6525, lon: 91.1721 },
  { name: '乌鲁木齐', province: '新疆', lat: 43.8256, lon: 87.6168 },
  { name: '香港', province: '特别行政区', lat: 22.3193, lon: 114.1694 },
  { name: '台北', province: '台湾', lat: 25.0330, lon: 121.5654 },
]

const RECENT_CITIES_KEY = 'daygarden_recent_cities'

export function getRecentCities(): CityOption[] {
  try {
    const raw = localStorage.getItem(RECENT_CITIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveRecentCity(city: CityOption) {
  try {
    const list = getRecentCities().filter(c => c.name !== city.name)
    list.unshift(city)
    localStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(list.slice(0, 10)))
  } catch {
    // ignore
  }
}

export async function searchCities(query: string): Promise<CityOption[]> {
  const q = query.trim()
  if (!q) return []
  const qLower = q.toLowerCase()
  const cleanQ = q.replace(/市$/, '')

  // 1. 本地国内全量城市库精确与模糊匹配（优先权威地级市）
  const allKnown = (await import('../data/chinese-cities.json')).default as Array<CityOption & { pinyin?: string }>
  const localMatches = allKnown.filter(c => {
    return (
      c.name === q ||
      c.name === cleanQ ||
      c.name.includes(q) ||
      (q.length >= 2 && q.includes(c.name)) ||
      c.province.includes(q) ||
      (c.pinyin && (c.pinyin.startsWith(qLower) || c.pinyin.includes(qLower)))
    )
  }).sort((a, b) => {
    // 优先名称完全匹配
    const aExact = a.name === q || a.name === cleanQ
    const bExact = b.name === q || b.name === cleanQ
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    return 0
  }).map(({ name, province, lat, lon }) => ({ name, province, lat, lon }))

  // 若本地权威城市库已有匹配结果，优先直接返回（避免第三方地图API模糊村镇导致省份混淆）
  if (localMatches.length > 0) {
    return localMatches.slice(0, 10)
  }

  // 2. 结合 Open-Meteo 全球地理位置检索（覆盖海外国际城市与小众地点）
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=zh&format=json`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (res.ok) {
      const data = await res.json()
      if (data.results && Array.isArray(data.results)) {
        const names = new Set(localMatches.map(c => c.name))
        for (const item of data.results) {
          if (!names.has(item.name)) {
            localMatches.push({
              name: item.name,
              province: item.admin1 || item.country || '海外',
              lat: Number(Number(item.latitude).toFixed(4)),
              lon: Number(Number(item.longitude).toFixed(4)),
            })
            names.add(item.name)
          }
        }
      }
    }
  } catch {
    // ignore timeout
  }

  return localMatches.slice(0, 10)
}

export function getWeatherMeta(code: number): { text: string; icon: string } {
  if (code === 0) return { text: '晴朗', icon: 'Sun' }
  if (code === 1 || code === 2) return { text: '多云', icon: 'CloudSun' }
  if (code === 3) return { text: '阴天', icon: 'Cloud' }
  if (code === 45 || code === 48) return { text: '有雾', icon: 'CloudFog' }
  if (code >= 51 && code <= 57) return { text: '毛毛雨', icon: 'CloudDrizzle' }
  if (code >= 61 && code <= 65) return { text: '降雨', icon: 'CloudRain' }
  if (code === 66 || code === 67) return { text: '冻雨', icon: 'CloudRain' }
  if (code >= 71 && code <= 77) return { text: '降雪', icon: 'CloudSnow' }
  if (code >= 80 && code <= 82) return { text: '阵雨', icon: 'CloudRain' }
  if (code === 85 || code === 86) return { text: '阵雪', icon: 'CloudSnow' }
  if (code >= 95) return { text: '雷暴', icon: 'CloudLightning' }
  return { text: '多云', icon: 'Cloud' }
}

const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const HOURLY_FIELDS = 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m,wind_direction_10m,uv_index,pressure_msl,is_day'
const CURRENT_FIELDS = 'weather_code,temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,pressure_msl,uv_index'
const num = (value: unknown, digits = 0): number => {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  const f = 10 ** digits
  return Math.round(n * f) / f
}
const optional = (value: unknown, digits = 0): number | undefined => (value === null || value === undefined || !Number.isFinite(Number(value)) ? undefined : num(value, digits))

/** 把逐小时数据按日期（城市当地）分组 */
function groupHours(hourly: Record<string, unknown[]> | undefined): Map<string, HourlyWeather[]> {
  const byDate = new Map<string, HourlyWeather[]>()
  const times = hourly?.time as string[] | undefined
  if (!hourly || !Array.isArray(times)) return byDate
  const col = (key: string) => (Array.isArray(hourly[key]) ? hourly[key] : []) as unknown[]
  const [temp, apparent, humidity, prob, precip, code, wind, dir, uv, pressure, isDay] = ['temperature_2m', 'apparent_temperature', 'relative_humidity_2m', 'precipitation_probability', 'precipitation', 'weather_code', 'wind_speed_10m', 'wind_direction_10m', 'uv_index', 'pressure_msl', 'is_day'].map(col)
  times.forEach((time, i) => {
    if (typeof time !== 'string' || temp![i] === null || temp![i] === undefined) return
    const hour: HourlyWeather = {
      time,
      temp: num(temp![i]),
      apparent: num(apparent![i]),
      humidity: num(humidity![i]),
      precipProb: num(prob![i]),
      precip: num(precip![i], 1),
      code: num(code![i]),
      windSpeed: num(wind![i], 1),
      windDir: num(dir![i]),
      uv: num(uv![i], 1),
      pressure: num(pressure![i]),
      isDay: Number(isDay![i]) === 1,
    }
    const date = time.slice(0, 10)
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date)!.push(hour)
  })
  return byDate
}

export async function fetch7DayWeather(city: CityOption): Promise<WeatherDay[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,uv_index_max,sunrise,sunset,precipitation_sum,wind_speed_10m_max,wind_direction_10m_dominant&hourly=${HOURLY_FIELDS}&current=${CURRENT_FIELDS}&minutely_15=precipitation&past_minutely_15=0&forecast_minutely_15=8&timezone=auto&past_days=2&forecast_days=8`

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`)
    const data = await res.json()
    const daily = data.daily

    if (!daily || !daily.time) throw new Error('Invalid weather payload')

    const todayDateStr = localDateKey()
    const hoursByDate = groupHours(data.hourly)
    const minutely = data.minutely_15
    const nowcast = Array.isArray(minutely?.time)
      ? (minutely.time as string[]).map((time, i) => ({ time, precip: num(minutely.precipitation?.[i], 2) }))
      : undefined
    const current = data.current

    const list: WeatherDay[] = daily.time.map((timeStr: string, idx: number): WeatherDay => {
      const d = new Date(timeStr + 'T00:00:00')
      const isToday = timeStr === todayDateStr
      const isPast = timeStr < todayDateStr
      const dayOfWeek = WEEK_DAYS[d.getDay()]
      const code = daily.weathercode[idx]
      const meta = getWeatherMeta(code)

      return {
        date: timeStr,
        dayOfWeek: isToday ? '今天' : dayOfWeek,
        isToday,
        isPast,
        weatherCode: code,
        weatherText: meta.text,
        iconName: meta.icon,
        tempMax: Math.round(daily.temperature_2m_max[idx]),
        tempMin: Math.round(daily.temperature_2m_min[idx]),
        apparentTempMax: Math.round(daily.apparent_temperature_max[idx]),
        apparentTempMin: Math.round(daily.apparent_temperature_min[idx]),
        precipProb: Math.round(daily.precipitation_probability_max[idx] || 0),
        uvIndex: daily.uv_index_max ? Math.round(daily.uv_index_max[idx]) : undefined,
        dataSource: 'live',
        sunrise: daily.sunrise?.[idx] ?? undefined,
        sunset: daily.sunset?.[idx] ?? undefined,
        utcOffsetSeconds: typeof data.utc_offset_seconds === 'number' ? data.utc_offset_seconds : undefined,
        precipSum: optional(daily.precipitation_sum?.[idx], 1),
        windSpeedMax: optional(daily.wind_speed_10m_max?.[idx], 1),
        windDirDominant: optional(daily.wind_direction_10m_dominant?.[idx]),
        hours: hoursByDate.get(timeStr),
        nowcast: isToday ? nowcast : undefined,
        current: isToday && typeof current?.weather_code === 'number'
          ? {
              weatherCode: current.weather_code,
              windSpeed: Number(current.wind_speed_10m) || 0,
              fetchedAt: Date.now(),
              time: typeof current.time === 'string' ? current.time : undefined,
              temp: optional(current.temperature_2m),
              apparent: optional(current.apparent_temperature),
              humidity: optional(current.relative_humidity_2m),
              windDir: optional(current.wind_direction_10m),
              pressure: optional(current.pressure_msl),
              uv: optional(current.uv_index, 1),
            }
          : undefined,
      }
    })

    // 缓存数据到 localStorage
    try {
      localStorage.setItem('daygarden_weather_cache', JSON.stringify({ city: city.name, list, timestamp: Date.now() }))
    } catch {
      // ignore
    }

    return list
  } catch (err) {
    console.warn('Weather fetch failed, trying local fallback:', err)
    // 尝试读取本地缓存
    try {
      const cached = localStorage.getItem('daygarden_weather_cache') || localStorage.getItem('daybloom_weather_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        const today = localDateKey()
        if (parsed.city === city.name && Date.now() - parsed.timestamp < 6 * 60 * 60 * 1000 && Array.isArray(parsed.list) && parsed.list.length >= 8 && parsed.list.some((day: WeatherDay) => day.date === today)) {
          return parsed.list.map((day: WeatherDay): WeatherDay => ({ ...day, isToday: day.date === today, isPast: day.date < today, dataSource: 'cached' }))
        }
      }
    } catch {
      // ignore
    }

    // 兜底返回模拟数据（前两天 + 今天 + 后七天）
    return generateFallbackWeather()
  }
}

function generateFallbackWeather(): WeatherDay[] {
  const now = new Date()
  const list: WeatherDay[] = []
  for (let offset = -2; offset <= 7; offset++) {
    const cur = new Date(now)
    cur.setDate(now.getDate() + offset)
    const timeStr = localDateKey(cur)
    const isToday = offset === 0
    const isPast = offset < 0
    const dayOfWeek = isToday ? '今天' : WEEK_DAYS[cur.getDay()]
    const tempMax = 23 + Math.floor(Math.sin(offset) * 3)
    const tempMin = 15 + Math.floor(Math.cos(offset) * 2)

    list.push({
      date: timeStr,
      dayOfWeek,
      isToday,
      isPast,
      weatherCode: 1,
      weatherText: '多云',
      iconName: 'CloudSun',
      tempMax,
      tempMin,
      apparentTempMax: tempMax - 1,
      apparentTempMin: tempMin - 1,
      precipProb: 15,
      uvIndex: 4,
      dataSource: 'demo',
    })
  }
  return list
}
