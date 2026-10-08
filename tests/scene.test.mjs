import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { root, json, memoryStorage } from './helpers.mjs'

const require = createRequire(import.meta.url)

async function load(globals = {}) {
  const source = [
    "export * as scene from './src/services/scene.ts'",
    "export * as geometry from './src/components/scene/geometry.ts'",
    "export * as weather from './src/services/weather.ts'",
  ].join('\n')
  const result = await build({ stdin: { contents: source, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vue', 'lunar-javascript'], logLevel: 'silent' })
  const module = { exports: {} }
  vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, require, console, AbortSignal, Response, setTimeout, clearTimeout, ...globals })
  return module.exports
}

const day = (overrides = {}) => ({ date: '2026-10-07', dayOfWeek: '今天', isToday: true, isPast: false, weatherCode: 0, weatherText: '晴朗', iconName: 'Sun', tempMax: 24, tempMin: 14, apparentTempMax: 24, apparentTempMin: 14, precipProb: 0, dataSource: 'live', ...overrides })

test('Weather codes map to sky scenes, including freezing rain and snow showers', async () => {
  const { scene } = await load()
  const expected = { 0: 'clear', 1: 'clear', 2: 'partly', 3: 'overcast', 45: 'fog', 53: 'drizzle', 63: 'rain', 66: 'rain', 81: 'rain', 73: 'snow', 85: 'snow', 95: 'storm', 99: 'storm' }
  for (const [code, sky] of Object.entries(expected)) assert.equal(scene.skyFromWeatherCode(Number(code)), sky, `code ${code}`)
  assert.deepEqual([10, 25, 45].map(scene.windLevel), [0, 1, 2])
})

test('Day and night follow the city’s own sunrise and sunset, not the browser clock', async () => {
  const { scene } = await load()
  const paris = day({ sunrise: '2026-10-07T07:58', sunset: '2026-10-07T19:15', utcOffsetSeconds: 7200 })
  const at = (h, m = 0) => new Date(Date.UTC(2026, 9, 7, h, m))
  assert.equal(scene.dayPhase(at(11, 30), paris).phase, 'day')
  assert.ok(scene.dayPhase(at(11, 36), paris).altitude > 0.99)
  assert.equal(scene.dayPhase(at(5, 50), paris).phase, 'dawn')
  assert.equal(scene.dayPhase(at(17, 0), paris).phase, 'dusk')
  assert.equal(scene.dayPhase(at(20, 0), paris).phase, 'night')
  assert.equal(scene.dayPhase(at(3, 0), paris).phase, 'night')
})

test('Fresh observations drive the scene; stale observations and demo data fall back', async () => {
  const { scene } = await load()
  const now = new Date()
  const fresh = scene.deriveScene(now, day({ weatherCode: 0, current: { weatherCode: 61, windSpeed: 45, fetchedAt: Date.now() } }))
  assert.equal(fresh.sky, 'rain')
  assert.equal(fresh.wind, 2)
  assert.equal(fresh.warm, false)
  const stale = scene.deriveScene(now, day({ weatherCode: 0, current: { weatherCode: 95, windSpeed: 60, fetchedAt: Date.now() - 4 * 3600 * 1000 } }))
  assert.equal(stale.sky, 'clear')
  assert.equal(stale.wind, 0)
  const demo = scene.deriveScene(now, day({ weatherCode: 95, dataSource: 'demo' }))
  assert.equal(demo.live, false)
  assert.equal(demo.sky, 'partly')
  assert.equal(scene.deriveScene(now, day({ weatherCode: 95 })).wind, 1, 'thunderstorms always bring at least a breeze')
})

test('Seasons flip south of the equator and the moon follows the lunar day', async () => {
  const { scene } = await load()
  const october = new Date(2026, 9, 7)
  assert.equal(scene.seasonOf(october, 39.9), 'autumn')
  assert.equal(scene.seasonOf(october, -33.9), 'spring')
  const midAutumn = scene.moonPhase(new Date(2026, 8, 25, 12))
  assert.ok(midAutumn > 0.45 && midAutumn < 0.52, `mid-autumn moon should be full, got ${midAutumn}`)
  assert.ok(scene.moonPhase(october) > 0.75, 'the 27th lunar day is a waning crescent')
})

test('Occasional events only appear where they make sense', async () => {
  const { scene } = await load()
  const base = { phase: 'day', season: 'autumn', wind: 0, moon: 0.5, altitude: 0.8, warm: true, live: true }
  const storm = scene.sceneEventsFor({ ...base, sky: 'storm', wind: 1 })
  assert.ok(storm.includes('lightning') && !storm.includes('birds') && !storm.includes('rabbit'))
  const rain = scene.sceneEventsFor({ ...base, sky: 'rain' })
  assert.ok(rain.includes('frog') && rain.includes('swallow') && !rain.includes('perch'))
  const clearNight = scene.sceneEventsFor({ ...base, sky: 'clear', phase: 'night' })
  assert.ok(clearNight.includes('meteor') && clearNight.includes('hedgehog') && !clearNight.includes('birds'))
  assert.equal(scene.pickSceneEvent({ ...base, sky: 'clear' }, () => 0), 'birds')
  assert.ok(scene.sceneEventsFor({ ...base, sky: 'clear' }).includes('squirrel'))
  assert.ok(!scene.sceneEventsFor({ ...base, sky: 'clear', wind: 2 }).includes('perch'), 'no perched bird in a gale')
  // 天幕只有天象：流星与闪电；鸟兽与落叶都在页底花园
  assert.deepEqual([...scene.SKY_EVENTS].sort(), ['lightning', 'meteor'])
})

test('The sun sits in the open sky between greeting and date card; phones get a small corner sun', async () => {
  const { geometry } = await load()
  const desktop = {
    width: 1440, height: 2900, shellLeft: 160, shellRight: 1280,
    hero: { x: 160, y: 80, w: 1120, h: 214 }, textRight: 600,
    dateCard: { x: 950, y: 110, w: 330, h: 150 }, contentTop: 294, gardenHeight: 212,
  }
  assert.equal(geometry.isWrapped(desktop), false)
  const sun = geometry.sunAnchor(desktop)
  assert.ok(sun.x - sun.r > desktop.textRight && sun.x + sun.r < desktop.dateCard.x, 'the sun never overlaps the greeting or the date card')
  assert.ok(sun.top + sun.travel + sun.r < desktop.contentTop, 'even at dusk the sun stays above the cards')

  const phone = { ...desktop, width: 375, shellLeft: 18, shellRight: 357, textRight: 300, dateCard: { x: 18, y: 260, w: 339, h: 150 }, hero: { x: 18, y: 80, w: 339, h: 354 }, contentTop: 434 }
  assert.equal(geometry.isWrapped(phone), true)
  const phoneSun = geometry.sunAnchor(phone)
  assert.ok(phoneSun.x + phoneSun.r <= phone.shellRight && phoneSun.r < 20)
})

test('The garden keeps its trees, fence and puddle apart and inside the page', async () => {
  const { geometry } = await load()
  for (const [width, height] of [[1440, 212], [1920, 212], [768, 212], [390, 176], [320, 176]]) {
    const g = geometry.gardenLayout(width, height)
    const oakHalf = (geometry.OAK_SIZE / 2) * g.scale * 0.85
    const pineHalf = (geometry.PINE_SIZE.w / 2) * g.scale
    assert.equal(g.ridge, height - 46)
    assert.ok(g.pine.x - pineHalf >= 0 && g.oak.x + oakHalf <= width + 4, `${width}: trees stay on the page`)
    assert.ok(g.pine.x + pineHalf < g.fence.x, `${width}: the pine stands clear of the fence`)
    assert.ok(g.tall[g.tall.length - 1] < g.puddle.x - g.puddle.rx, `${width}: tall plants stay clear of the puddle`)
    assert.ok(g.frogX + 20 < g.oak.x - 8 && (g.frogX + 20 < g.puddle.x - g.puddle.rx || g.frogX > g.puddle.x + g.puddle.rx), `${width}: the frog sits beside the puddle, not in it or under the trunk`)
    assert.ok(g.puddle.x + g.puddle.rx < g.oak.x - oakHalf * 0.4, `${width}: the puddle is not under the big tree`)
    assert.ok(g.perch.y < g.oak.base && g.perch.x < g.oak.x, `${width}: the perch is on the left branch of the big tree`)
    if (g.sapling) {
      const saplingHalf = oakHalf * geometry.SAPLING_SCALE
      assert.ok(g.sapling.x - saplingHalf > g.puddle.x + g.puddle.rx && g.sapling.x + saplingHalf < g.oak.x - oakHalf, `${width}: the sapling has its own space`)
    }
    assert.equal(g.narrow, width < 600)
  }
})

test('Weather fetch keeps sunrise, sunset, the city offset and today’s observation', async () => {
  const pad = n => String(n).padStart(2, '0')
  const key = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const dates = Array.from({ length: 10 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i - 2); return key(d) })
  let requested = ''
  const fetch = async url => {
    requested = url
    return json({
      utc_offset_seconds: 28800,
      current: { weather_code: 85, wind_speed_10m: 22.4 },
      daily: {
        time: dates,
        weathercode: dates.map((_, i) => (i === 3 ? 66 : 2)),
        temperature_2m_max: dates.map(() => 20), temperature_2m_min: dates.map(() => 10),
        apparent_temperature_max: dates.map(() => 20), apparent_temperature_min: dates.map(() => 10),
        precipitation_probability_max: dates.map(() => 10), uv_index_max: dates.map(() => 3),
        sunrise: dates.map(d => `${d}T06:10`), sunset: dates.map(d => `${d}T17:48`),
      },
    })
  }
  const { weather } = await load({ fetch, localStorage: memoryStorage() })
  const list = await weather.fetch7DayWeather({ name: '北京', province: '北京', lat: 39.9, lon: 116.4 })
  assert.match(requested, /current=weather_code,[^&]*wind_speed_10m/)
  assert.match(requested, /sunrise,sunset/)
  const today = list.find(d => d.isToday)
  assert.equal(today.current.weatherCode, 85)
  assert.equal(today.current.windSpeed, 22.4)
  assert.equal(today.utcOffsetSeconds, 28800)
  assert.equal(today.sunrise, `${today.date}T06:10`)
  assert.equal(list.filter(d => d.current).length, 1, 'only today carries an observation')
  assert.equal(list[3].weatherText, '冻雨')
  assert.equal(weather.getWeatherMeta(85).text, '阵雪')
  assert.equal(weather.getWeatherMeta(81).icon, 'CloudRain')
})

test('3D environment: day progress drives the sun side, seasons drive colours, and the camera frames every screen', async () => {
  const { scene, env } = await load3d()
  const paris = { date: '2026-10-07', isToday: true, isPast: false, weatherCode: 0, tempMax: 20, tempMin: 10, apparentTempMax: 20, apparentTempMin: 10, precipProb: 0, dataSource: 'live', sunrise: '2026-10-07T08:00', sunset: '2026-10-07T20:00', utcOffsetSeconds: 0 }
  const morning = scene.dayPhase(new Date(Date.UTC(2026, 9, 7, 9, 0)), paris)
  const evening = scene.dayPhase(new Date(Date.UTC(2026, 9, 7, 19, 0)), paris)
  assert.ok(Math.abs(morning.progress - 1 / 12) < 1e-6 && Math.abs(evening.progress - 11 / 12) < 1e-6)
  assert.equal(scene.dayPhase(new Date(Date.UTC(2026, 9, 7, 23, 0)), paris).progress, null)
  // 上午光从左（东）来，傍晚从右（西）来；夜里是偏蓝的月光
  const am = env.lighting({ sky: 'clear', phase: 'day', dayProgress: morning.progress }, false)
  const pm = env.lighting({ sky: 'clear', phase: 'dusk', dayProgress: evening.progress }, false)
  assert.ok(am.sunDir[0] < -0.5 && pm.sunDir[0] > 0.5)
  assert.ok(env.lighting({ sky: 'storm', phase: 'day', dayProgress: 0.5 }, false).sunIntensity < am.sunIntensity / 4)
  assert.equal(env.lighting({ sky: 'clear', phase: 'night', dayProgress: null }, false).night, true)
  assert.ok(env.lighting({ sky: 'clear', phase: 'day', dayProgress: 0.5 }, true).sunIntensity < env.lighting({ sky: 'clear', phase: 'day', dayProgress: 0.5 }, false).sunIntensity)
  // 冬天树冠落尽，雪天地面变白
  assert.equal(env.gardenPalette('winter', false).canopy, null)
  assert.equal(env.gardenPalette('autumn', true).ground, 0xf1f4f6)
  assert.ok(env.gardenPalette('summer', false).canopy.length === 3)
  // 宽屏把 ±24 的全景收进画面；手机把湖、木屋与大树（x ≈ -10 ~ 13）收进画面
  for (const [aspect, left, right] of [[4.8, -22, 22], [1.7, -9.5, 12.5], [2.7, -14, 14]]) {
    const rig = env.gardenRig(aspect)
    const tan = Math.tan((rig.fov / 2) * Math.PI / 180) * aspect
    const halfWidthAtZ0 = rig.position[2] * tan
    assert.ok(rig.position[0] - halfWidthAtZ0 <= left && rig.position[0] + halfWidthAtZ0 >= right, `aspect ${aspect} frames ${left}..${right}`)
  }
  assert.ok(scene.sceneEventsFor({ sky: 'clear', phase: 'day', season: 'summer', wind: 0, moon: 0.5, altitude: 0.8, dayProgress: 0.5, warm: true, live: true }).includes('fish'))
  assert.ok(!scene.sceneEventsFor({ sky: 'clear', phase: 'day', season: 'winter', wind: 0, moon: 0.5, altitude: 0.8, dayProgress: 0.5, warm: false, live: true }).includes('fish'), 'the lake is frozen in winter')
})

async function load3d() {
  const source = "export * as scene from './src/services/scene.ts'\nexport * as env from './src/components/scene/three/environment.ts'"
  const result = await build({ stdin: { contents: source, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vue', 'lunar-javascript'], logLevel: 'silent' })
  const module = { exports: {} }
  vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, require, console })
  return module.exports
}
