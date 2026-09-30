import type { CityOption, WeatherDay } from '../types'
import { localDateKey } from './day'

export const DEFAULT_CITIES: CityOption[] = [
  { name: '北京', province: '直辖市', lat: 39.9042, lon: 116.4074 },
  { name: '上海', province: '直辖市', lat: 31.2304, lon: 121.4737 },
  { name: '广州', province: '广东', lat: 23.1291, lon: 113.2644 },
  { name: '深圳', province: '广东', lat: 22.5431, lon: 114.0579 },
  { name: '杭州', province: '浙江', lat: 30.2741, lon: 120.1551 },
  { name: '成都', province: '四川', lat: 30.5728, lon: 104.0668 },
  { name: '武汉', province: '湖北', lat: 30.5928, lon: 114.3055 },
  { name: '南京', province: '江苏', lat: 32.0603, lon: 118.7969 },
  { name: '西安', province: '陕西', lat: 34.3416, lon: 108.9398 },
  { name: '厦门', province: '福建', lat: 24.4798, lon: 118.0894 },
  { name: '昆明', province: '云南', lat: 25.0406, lon: 102.7123 },
]

export function getWeatherMeta(code: number): { text: string; icon: string } {
  if (code === 0) return { text: '晴朗', icon: 'Sun' }
  if (code === 1 || code === 2) return { text: '多云', icon: 'CloudSun' }
  if (code === 3) return { text: '阴天', icon: 'Cloud' }
  if (code === 45 || code === 48) return { text: '有雾', icon: 'CloudFog' }
  if (code >= 51 && code <= 57) return { text: '毛毛雨', icon: 'CloudDrizzle' }
  if (code >= 61 && code <= 65) return { text: '降雨', icon: 'CloudRain' }
  if (code >= 71 && code <= 77) return { text: '降雪', icon: 'CloudSnow' }
  if (code >= 80 && code <= 82) return { text: '阵雨', icon: 'CloudLightning' }
  if (code >= 95) return { text: '雷暴', icon: 'CloudLightning' }
  return { text: '多云', icon: 'Cloud' }
}

const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export async function fetch7DayWeather(city: CityOption): Promise<WeatherDay[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,uv_index_max&timezone=auto&past_days=2&forecast_days=5`

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error(`Weather API error: ${res.status}`)
    const data = await res.json()
    const daily = data.daily

    if (!daily || !daily.time) throw new Error('Invalid weather payload')

    const todayDateStr = localDateKey()

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
        if (parsed.city === city.name && Date.now() - parsed.timestamp < 6 * 60 * 60 * 1000 && Array.isArray(parsed.list) && parsed.list.length === 7 && parsed.list.some((day: WeatherDay) => day.date === today)) {
          return parsed.list.map((day: WeatherDay): WeatherDay => ({ ...day, isToday: day.date === today, isPast: day.date < today, dataSource: 'cached' }))
        }
      }
    } catch {
      // ignore
    }

    // 兜底返回模拟 7 天数据
    return generateFallbackWeather()
  }
}

function generateFallbackWeather(): WeatherDay[] {
  const now = new Date()
  const list: WeatherDay[] = []
  for (let offset = -2; offset <= 4; offset++) {
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
