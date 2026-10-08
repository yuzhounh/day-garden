import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { root, json, memoryStorage } from './helpers.mjs'

const require = createRequire(import.meta.url)

async function load(globals = {}) {
  const source = "export * as insights from './src/services/weatherInsights.ts'\nexport * as weather from './src/services/weather.ts'"
  const result = await build({ stdin: { contents: source, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vue', 'lunar-javascript'], logLevel: 'silent' })
  const module = { exports: {} }
  vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, require, console, AbortSignal, Response, setTimeout, clearTimeout, ...globals })
  return module.exports
}

const hour = (date, h, overrides = {}) => ({ time: `${date}T${String(h).padStart(2, '0')}:00`, temp: 20, apparent: 20, humidity: 50, precipProb: 0, precip: 0, code: 0, windSpeed: 8, windDir: 135, uv: h >= 10 && h <= 14 ? 5 : 1, pressure: 1015, isDay: h >= 6 && h < 18, ...overrides })
const hoursOf = (date, fn = () => ({})) => Array.from({ length: 24 }, (_, h) => hour(date, h, fn(h)))
const day = (overrides = {}) => ({ date: '2026-10-07', dayOfWeek: '今天', isToday: true, isPast: false, weatherCode: 0, weatherText: '晴朗', iconName: 'Sun', tempMax: 26, tempMin: 13, apparentTempMax: 24, apparentTempMin: 11, precipProb: 0, uvIndex: 5, dataSource: 'live', sunrise: '2026-10-07T06:16', sunset: '2026-10-07T17:47', utcOffsetSeconds: 28800, precipSum: 0, windSpeedMax: 12, windDirDominant: 180, ...overrides })

test('Wind uses Beaufort levels and is named by where it blows from', async () => {
  const { insights } = await load()
  assert.deepEqual([0.5, 3, 8, 15, 25, 33, 45, 55, 120].map(insights.beaufort), [0, 1, 2, 3, 4, 5, 6, 7, 12])
  assert.equal(insights.windDirectionName(135), '东南风')
  assert.equal(insights.windDirectionName(359), '北风')
  assert.equal(insights.windDirectionName(200, 0.4), '静风')
  assert.equal(insights.humidityLevel(26), '干燥')
  assert.equal(insights.feelsLevel(23), '舒适')
})

test('The city clock drives "now", the 24-hour strip crosses midnight, and today shows live values', async () => {
  const { insights } = await load()
  // 北京 13:42（UTC+8）
  const nowIso = insights.cityNow(28800, new Date(Date.UTC(2026, 9, 7, 5, 42)))
  assert.equal(nowIso, '2026-10-07T13:42')
  const today = day({ hours: hoursOf('2026-10-07'), current: { weatherCode: 0, windSpeed: 10, windDir: 180, humidity: 26, apparent: 23, pressure: 1020, uv: 4.2, fetchedAt: Date.now() } })
  const tomorrow = day({ date: '2026-10-08', isToday: false, hours: hoursOf('2026-10-08'), sunrise: '2026-10-08T06:17' })
  const strip = insights.hourlyStrip([today, tomorrow], today, nowIso)
  assert.equal(strip.length, 24)
  assert.equal(strip[0].label, '现在')
  assert.equal(strip[0].time, '2026-10-07T13:00')
  assert.equal(strip[11].label, '明日')
  assert.equal(insights.hourlyStrip([today, tomorrow], tomorrow, nowIso)[0].label, '00:00')

  const m = insights.dayMetrics(today, nowIso, tomorrow)
  assert.equal(m.live, true)
  assert.deepEqual([m.humidity, m.apparent, m.pressure, m.uv, m.windName, m.windLevel], [26, 23, 1020, 4, '南风', 2])
  assert.equal(m.sunLabel, '日落')
  assert.ok(m.sunProgress > 0.6 && m.sunProgress < 0.7)
  const evening = insights.dayMetrics(today, '2026-10-07T19:30', tomorrow)
  assert.deepEqual([evening.sunLabel, evening.sunTime, evening.sunProgress], ['明日日出', '06:17', null])
})

test('Two-hour precipitation reads the 15-minute forecast, then falls back to hourly chances', async () => {
  const { insights } = await load()
  const steps = (values, start = 13 * 60 + 45) => values.map((precip, i) => { const t = start + i * 15; return { time: `2026-10-07T${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`, precip } })
  const nowIso = '2026-10-07T13:50'
  assert.equal(insights.precipOutlook(day({ nowcast: steps([0, 0, 0, 0, 0, 0, 0, 0]) }), nowIso).title, '两小时内无降水')
  const later = insights.precipOutlook(day({ nowcast: steps([0, 0, 0, 0.4, 0.8, 0.6, 0, 0]) }), nowIso)
  assert.equal(later.title, '14:30 前后可能开始降水')
  assert.equal(later.wet, true)
  const raining = insights.precipOutlook(day({ nowcast: steps([0.5, 0.3, 0, 0, 0, 0, 0, 0]) }), nowIso)
  assert.deepEqual([raining.title, raining.hint], ['正在降水', '预计 14:15 前后停歇'])
  const hourly = insights.precipOutlook(day({ hours: hoursOf('2026-10-07', h => ({ precipProb: h === 15 ? 70 : 10 })) }), nowIso)
  assert.equal(hourly.title, '两小时内可能降水')
  const future = insights.precipOutlook(day({ isToday: false, precipProb: 80, precipSum: 6.4, hours: hoursOf('2026-10-09', h => ({ precipProb: h >= 14 && h <= 18 ? 80 : 10 })) }), nowIso)
  assert.deepEqual([future.title, future.hint], ['全天降水概率 80%', '14:00–18:00 较可能降水，预计累计 6.4 mm'])
  assert.equal(insights.precipOutlook(day({ isPast: true, isToday: false, precipSum: 0 }), nowIso).title, '当天无明显降水')
})

test('Travel advice follows the weather: clothing, sun, exercise, cycling, umbrella and colds', async () => {
  const { insights } = await load()
  const pick = advice => Object.fromEntries(advice.map(a => [a.key, a.label]))
  const yesterday = day({ date: '2026-10-06', isToday: false, tempMax: 26, tempMin: 14 })
  const dry = pick(insights.lifeAdvice(day({ hours: hoursOf('2026-10-07', () => ({ humidity: 25 })) }), yesterday))
  assert.deepEqual(dry, { dress: '适宜长袖', sun: '适当防晒', sport: '宜户外运动', cycle: '适宜骑行', umbrella: '不用带伞', cold: '易感冒' })

  const storm = pick(insights.lifeAdvice(day({ weatherCode: 95, precipProb: 90, precipSum: 18, windSpeedMax: 45, uvIndex: 1, tempMax: 20, tempMin: 15, apparentTempMax: 18, apparentTempMin: 14 })))
  assert.deepEqual(storm, { dress: '适宜外套', sun: '无需防晒', sport: '不宜户外运动', cycle: '不宜骑行', umbrella: '需要带伞', cold: '感冒少发' })

  const winter = insights.lifeAdvice(day({ weatherCode: 73, tempMax: 1, tempMin: -8, apparentTempMax: -4, apparentTempMin: -14, precipProb: 60, precipSum: 2, uvIndex: 2 }), day({ tempMax: 9, tempMin: 0 }))
  const w = pick(winter)
  assert.equal(w.dress, '穿羽绒服')
  assert.equal(w.cycle, '不宜骑行')
  assert.equal(w.cold, '极易感冒')
  assert.match(winter.find(a => a.key === 'cold').detail, /较前一天降温 8°/)
  assert.ok(insights.lifeAdvice(day({ uvIndex: 9 })).find(a => a.key === 'umbrella').label === '可带遮阳伞')
})

test('Weather fetch groups hourly data by city date and keeps the two-hour forecast for today', async () => {
  const pad = n => String(n).padStart(2, '0')
  const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const dates = Array.from({ length: 10 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i - 2); return key(d) })
  const times = dates.flatMap(d => Array.from({ length: 24 }, (_, h) => `${d}T${pad(h)}:00`))
  const series = value => times.map(() => value)
  let requested = ''
  const fetch = async url => {
    requested = url
    return json({
      utc_offset_seconds: 28800,
      current: { time: `${dates[2]}T13:45`, weather_code: 0, temperature_2m: 25.6, apparent_temperature: 23.1, relative_humidity_2m: 26, wind_speed_10m: 10.3, wind_direction_10m: 185, pressure_msl: 1019.5, uv_index: 4.25 },
      minutely_15: { time: [`${dates[2]}T13:45`, `${dates[2]}T14:00`], precipitation: [0, 0.2] },
      hourly: { time: times, temperature_2m: series(20.4), apparent_temperature: series(19.6), relative_humidity_2m: series(48), precipitation_probability: series(10), precipitation: series(0), weather_code: series(1), wind_speed_10m: series(9.84), wind_direction_10m: series(135), uv_index: series(2.25), pressure_msl: series(1016.3), is_day: times.map(t => (Number(t.slice(11, 13)) >= 6 && Number(t.slice(11, 13)) < 18 ? 1 : 0)) },
      daily: {
        time: dates, weathercode: dates.map(() => 1),
        temperature_2m_max: dates.map(() => 24), temperature_2m_min: dates.map(() => 12),
        apparent_temperature_max: dates.map(() => 23), apparent_temperature_min: dates.map(() => 11),
        precipitation_probability_max: dates.map(() => 10), uv_index_max: dates.map(() => 5),
        sunrise: dates.map(d => `${d}T06:16`), sunset: dates.map(d => `${d}T17:47`),
        precipitation_sum: dates.map(() => 0.2), wind_speed_10m_max: dates.map(() => 14.6), wind_direction_10m_dominant: dates.map(() => 190),
      },
    })
  }
  const { weather } = await load({ fetch, localStorage: memoryStorage() })
  const list = await weather.fetch7DayWeather({ name: '北京', province: '北京', lat: 39.9, lon: 116.4 })
  assert.match(requested, /hourly=temperature_2m,apparent_temperature,relative_humidity_2m/)
  assert.match(requested, /minutely_15=precipitation&past_minutely_15=0&forecast_minutely_15=8/)
  const today = list.find(d => d.isToday)
  assert.equal(today.hours.length, 24)
  assert.equal(today.hours[0].time, `${today.date}T00:00`)
  assert.deepEqual([today.hours[8].temp, today.hours[8].windSpeed, today.hours[8].uv, today.hours[8].isDay], [20, 9.8, 2.3, true])
  assert.equal(today.nowcast.length, 2)
  assert.deepEqual([today.current.humidity, today.current.apparent, today.current.windDir, today.current.pressure, today.current.uv], [26, 23, 185, 1020, 4.3])
  assert.deepEqual([today.precipSum, today.windSpeedMax, today.windDirDominant], [0.2, 14.6, 190])
  assert.equal(list.filter(d => d.nowcast).length, 1, 'only today carries the two-hour forecast')
  assert.ok(list.every(d => d.hours.length === 24))
})
