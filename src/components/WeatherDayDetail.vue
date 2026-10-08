<script setup lang="ts">
import { computed, useId } from 'vue'
import {
  Sun,
  SunMedium,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Shirt,
  Footprints,
  Bike,
  Umbrella,
  UmbrellaOff,
  Pill,
} from 'lucide-vue-next'
import type { WeatherDay } from '../types'
import { getWeatherMeta } from '../services/weather'
import { useCurrentTime } from '../services/day'
import {
  cityNow,
  dayMetrics,
  feelsLevel,
  hourlyStrip,
  humidityLevel,
  lifeAdvice,
  precipOutlook,
  uvLevel,
  type AdviceKey,
  type HourCell,
} from '../services/weatherInsights'

/** 某一天的天气详情：分时预报、降水预报、六项指标与出行建议 */
const props = defineProps<{ day: WeatherDay; days: WeatherDay[] }>()

const uid = useId()
const now = useCurrentTime()
const index = computed(() => props.days.findIndex(d => d.date === props.day.date))
const prevDay = computed(() => (index.value > 0 ? props.days[index.value - 1] : undefined))
const nextDay = computed(() => (index.value >= 0 ? props.days[index.value + 1] : undefined))
const nowIso = computed(() => cityNow(props.day.utcOffsetSeconds ?? props.days.find(d => typeof d.utcOffsetSeconds === 'number')?.utcOffsetSeconds, now.value))

const metrics = computed(() => dayMetrics(props.day, nowIso.value, nextDay.value))
const strip = computed(() => hourlyStrip(props.days, props.day, nowIso.value))
const outlook = computed(() => precipOutlook(props.day, nowIso.value))
const advice = computed(() => lifeAdvice(props.day, prevDay.value))

const ICONS = { Sun, Moon, Cloud, CloudSun, CloudMoon, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudDrizzle }
function hourIcon(hour: HourCell) {
  let name = getWeatherMeta(hour.code).icon
  if (!hour.isDay && name === 'Sun') name = 'Moon'
  if (!hour.isDay && name === 'CloudSun') name = 'CloudMoon'
  return ICONS[name as keyof typeof ICONS] ?? Cloud
}
const ADVICE_ICONS: Record<AdviceKey, unknown> = { dress: Shirt, sun: SunMedium, sport: Footprints, cycle: Bike, umbrella: Umbrella, cold: Pill }
const adviceIcon = (key: AdviceKey, label: string) => (key === 'umbrella' && label === '不用带伞' ? UmbrellaOff : ADVICE_ICONS[key])

/** 分时温度曲线：每列 56px，曲线占 56px 高 */
const COL = 56
const CURVE_H = 56
const curve = computed(() => {
  const hours = strip.value
  if (!hours.length) return null
  const temps = hours.map(h => h.temp)
  const max = Math.max(...temps)
  const min = Math.min(...temps)
  const span = Math.max(4, max - min)
  const points = hours.map((h, i) => ({ x: i * COL + COL / 2, y: 22 + ((max - h.temp) / span) * 26, temp: h.temp, isNow: h.isNow }))
  let d = `M${points[0]!.x} ${points[0]!.y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    d += ` C${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)} ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)} ${p2.x} ${p2.y.toFixed(1)}`
  }
  return { points, d, width: hours.length * COL }
})

/* —— 仪表：270° 圆弧，缺口朝下 —— */
const CX = 32
const CY = 33
const R = 24
const polar = (deg: number, r = R) => {
  const a = (deg * Math.PI) / 180
  return { x: +(CX + r * Math.cos(a)).toFixed(2), y: +(CY + r * Math.sin(a)).toFixed(2) }
}
function arc(from: number, to: number, r = R): string {
  const a = polar(from, r)
  const b = polar(to, r)
  return `M${a.x} ${a.y}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const TRACK = arc(135, 405)
const at = (fraction: number) => 135 + 270 * clamp01(fraction)

const uvFraction = computed(() => (metrics.value.uv ?? 0) / 11)
const humidityFraction = computed(() => (metrics.value.humidity ?? 0) / 100)
const feelsFraction = computed(() => ((metrics.value.apparent ?? 18) + 10) / 50)
const pressureFraction = computed(() => ((metrics.value.pressure ?? 1013) - 980) / 60)
const needle = computed(() => polar(at(feelsFraction.value), 15))
/** 风向箭头：从风的来向吹向对面 */
const windArrow = computed(() => {
  const from = metrics.value.windDir
  if (from === null) return null
  const tail = polar(from - 90, 12)
  const head = polar(from + 90, 12)
  return { tail, head, angle: from + 90 }
})
const sunDot = computed(() => {
  const p = metrics.value.sunProgress
  if (p === null) return null
  return { x: +(32 - 25 * Math.cos(Math.PI * p)).toFixed(2), y: +(46 - 30 * Math.sin(Math.PI * p)).toFixed(2) }
})

const tiles = computed(() => {
  const m = metrics.value
  const hasData = Boolean(props.day.hours?.length)
  return {
    uv: { label: '紫外线', value: m.uv === null ? '—' : uvLevel(m.uv), sub: m.live && m.uvMax !== null ? `今日最高 ${m.uvMax}` : m.uv === null ? '' : `指数 ${m.uv}` },
    humidity: { label: '湿度', value: m.humidity === null ? '—' : `${m.humidity}%`, sub: m.humidity === null ? (hasData ? '' : '暂无数据') : humidityLevel(m.humidity) },
    feels: { label: '体感', value: m.apparent === null ? '—' : `${m.apparent}°`, sub: m.live ? `今日 ${m.apparentMin}~${m.apparentMax}°` : `最低 ${m.apparentMin}°` },
    wind: { label: m.windName, value: m.windSpeed === null ? '—' : `${m.windLevel} 级`, sub: m.windSpeed === null ? '暂无数据' : `${Math.round(m.windSpeed)} km/h${m.live ? '' : ' · 最大'}` },
    sun: { label: m.sunLabel, value: m.sunTime || '—', sub: m.sunLabel === '日落' ? (m.sunrise ? `日出 ${m.sunrise}` : '') : m.sunset ? `日落 ${m.sunset}` : '' },
    pressure: {
      label: '气压',
      value: m.pressure === null ? '—' : `${m.pressure}`,
      sub: m.pressure === null ? '暂无数据' : m.pressureTrend === 'up' ? 'hPa · 上升' : m.pressureTrend === 'down' ? 'hPa · 下降' : 'hPa · 平稳',
    },
  }
})
</script>

<template>
  <div class="wx-detail">
    <section v-if="curve" class="wx-block">
      <div class="wx-block-head">
        <span>分时预报</span>
        <small>{{ day.isToday ? '未来 24 小时' : '全天' }} · 左右滑动查看</small>
      </div>
      <div class="wx-hourly-scroll" tabindex="0" aria-label="分时预报">
        <div class="wx-hourly-track" :style="{ width: curve.width + 'px' }">
          <svg class="wx-hourly-curve" :width="curve.width" :height="CURVE_H" :viewBox="`0 0 ${curve.width} ${CURVE_H}`" aria-hidden="true">
            <path :d="curve.d" class="wx-curve-line" />
            <g v-for="(p, i) in curve.points" :key="i">
              <text :x="p.x" :y="p.y - 8" text-anchor="middle" class="wx-curve-label" :class="{ now: p.isNow }">{{ p.temp }}°</text>
              <circle v-if="p.isNow" :cx="p.x" :cy="p.y" r="3.6" class="wx-curve-now" />
            </g>
          </svg>
          <ol class="wx-hours">
            <li v-for="hour in strip" :key="hour.time" class="wx-hour" :class="{ now: hour.isNow }">
              <component :is="hourIcon(hour)" :size="20" :stroke-width="1.5" class="wx-hour-icon" :class="{ sunny: hour.isDay && hour.code <= 2 }" />
              <span class="wx-hour-rain" :class="{ empty: hour.precipProb < 20 }">{{ hour.precipProb >= 20 ? hour.precipProb + '%' : '·' }}</span>
              <span class="wx-hour-wind">{{ hour.windLevel }}级</span>
              <span class="wx-hour-time">{{ hour.label }}</span>
            </li>
          </ol>
        </div>
      </div>
    </section>

    <section class="wx-block wx-precip" :class="{ wet: outlook.wet }">
      <div class="wx-precip-text">
        <small>降水预报</small>
        <strong>{{ outlook.title }}</strong>
        <p>{{ outlook.hint }}</p>
      </div>
      <component :is="outlook.wet ? CloudRain : SunMedium" :size="42" :stroke-width="1.3" class="wx-precip-icon" />
    </section>

    <div class="wx-tiles">
      <section class="wx-tile">
        <div class="wx-tile-text"><small>{{ tiles.uv.label }}</small><strong>{{ tiles.uv.value }}</strong><span>{{ tiles.uv.sub }}</span></div>
        <svg class="wx-gauge" viewBox="0 0 64 64" aria-hidden="true">
          <defs>
            <linearGradient :id="`${uid}-uv`" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#6cc070" /><stop offset=".35" stop-color="#f2c94c" /><stop offset=".6" stop-color="#f2994a" /><stop offset=".8" stop-color="#eb5757" /><stop offset="1" stop-color="#9b6ad6" />
            </linearGradient>
          </defs>
          <path :d="TRACK" class="g-track" :stroke="`url(#${uid}-uv)`" style="opacity: .85" />
          <circle :cx="polar(at(uvFraction)).x" :cy="polar(at(uvFraction)).y" r="4" class="g-dot" />
          <text x="32" y="37" text-anchor="middle" class="g-value">{{ metrics.uv ?? '—' }}</text>
          <text x="32" y="58" text-anchor="middle" class="g-caption">UV</text>
        </svg>
      </section>

      <section class="wx-tile">
        <div class="wx-tile-text"><small>{{ tiles.humidity.label }}</small><strong>{{ tiles.humidity.value }}</strong><span>{{ tiles.humidity.sub }}</span></div>
        <svg class="wx-gauge" viewBox="0 0 64 64" aria-hidden="true">
          <path :d="TRACK" class="g-track g-muted" />
          <path v-if="metrics.humidity" :d="arc(135, at(humidityFraction))" class="g-track g-humid" />
          <path d="M32 24c3.6 4.6 5.4 7.8 5.4 10.2a5.4 5.4 0 0 1-10.8 0c0-2.4 1.8-5.6 5.4-10.2Z" class="g-drop" />
          <text x="32" y="58" text-anchor="middle" class="g-caption">{{ metrics.humidity === null ? '' : humidityLevel(metrics.humidity) }}</text>
        </svg>
      </section>

      <section class="wx-tile">
        <div class="wx-tile-text"><small>{{ tiles.feels.label }}</small><strong>{{ tiles.feels.value }}</strong><span>{{ tiles.feels.sub }}</span></div>
        <svg class="wx-gauge" viewBox="0 0 64 64" aria-hidden="true">
          <path :d="arc(135, at(0.4) - 3)" class="g-track g-cold" />
          <path :d="arc(at(0.4) + 3, at(0.72) - 3)" class="g-track g-mild" />
          <path :d="arc(at(0.72) + 3, 405)" class="g-track g-hot" />
          <line v-if="metrics.apparent !== null" :x1="CX" :y1="CY" :x2="needle.x" :y2="needle.y" class="g-needle" />
          <circle :cx="CX" :cy="CY" r="3.2" class="g-hub" />
          <text x="32" y="58" text-anchor="middle" class="g-caption">{{ metrics.apparent === null ? '' : feelsLevel(metrics.apparent) }}</text>
        </svg>
      </section>

      <section class="wx-tile">
        <div class="wx-tile-text"><small>{{ tiles.wind.label }}</small><strong>{{ tiles.wind.value }}</strong><span>{{ tiles.wind.sub }}</span></div>
        <svg class="wx-gauge" viewBox="0 0 64 64" aria-hidden="true">
          <circle :cx="CX" :cy="CY" r="24" class="g-ring" />
          <line v-for="deg in [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]" :key="deg" :x1="polar(deg, 21).x" :y1="polar(deg, 21).y" :x2="polar(deg, 24).x" :y2="polar(deg, 24).y" class="g-tick" />
          <text :x="CX" :y="CY - 14" text-anchor="middle" class="g-compass">北</text>
          <text :x="CX + 17" :y="CY + 3" text-anchor="middle" class="g-compass">东</text>
          <text :x="CX" :y="CY + 20" text-anchor="middle" class="g-compass">南</text>
          <text :x="CX - 17" :y="CY + 3" text-anchor="middle" class="g-compass">西</text>
          <template v-if="windArrow">
            <line :x1="windArrow.tail.x" :y1="windArrow.tail.y" :x2="windArrow.head.x" :y2="windArrow.head.y" class="g-wind" />
            <path :transform="`translate(${windArrow.head.x} ${windArrow.head.y}) rotate(${windArrow.angle})`" d="M0 0-5.5-3.2-5.5 3.2Z" class="g-wind-head" />
            <circle :cx="windArrow.tail.x" :cy="windArrow.tail.y" r="2" class="g-wind-head" />
          </template>
        </svg>
      </section>

      <section class="wx-tile">
        <div class="wx-tile-text"><small>{{ tiles.sun.label }}</small><strong>{{ tiles.sun.value }}</strong><span>{{ tiles.sun.sub }}</span></div>
        <svg class="wx-gauge" viewBox="0 0 64 64" aria-hidden="true">
          <line x1="3" y1="46" x2="61" y2="46" class="g-horizon" />
          <path d="M7 46A25 30 0 0 1 57 46" class="g-sun-path" />
          <circle v-if="sunDot" :cx="sunDot.x" :cy="sunDot.y" r="4" class="g-sun" />
          <text x="7" y="58" text-anchor="middle" class="g-caption small">{{ metrics.sunrise }}</text>
          <text x="57" y="58" text-anchor="middle" class="g-caption small">{{ metrics.sunset }}</text>
        </svg>
      </section>

      <section class="wx-tile">
        <div class="wx-tile-text"><small>{{ tiles.pressure.label }}</small><strong>{{ tiles.pressure.value }}</strong><span>{{ tiles.pressure.sub }}</span></div>
        <svg class="wx-gauge" viewBox="0 0 64 64" aria-hidden="true">
          <path :d="TRACK" class="g-track g-muted" />
          <path v-if="metrics.pressure !== null" :d="arc(135, at(pressureFraction))" class="g-track g-press" />
          <path v-if="metrics.pressureTrend === 'up'" d="M32 26v14M26.5 31.5 32 26l5.5 5.5" class="g-arrow" />
          <path v-else-if="metrics.pressureTrend === 'down'" d="M32 26v14M26.5 34.5 32 40l5.5-5.5" class="g-arrow" />
          <path v-else d="M25 33h14" class="g-arrow" />
          <text x="32" y="58" text-anchor="middle" class="g-caption">hPa</text>
        </svg>
      </section>
    </div>

    <section class="wx-block">
      <div class="wx-block-head">
        <span>出行建议</span>
        <small>按当日天气推算</small>
      </div>
      <div class="wx-advice-grid">
        <div v-for="item in advice" :key="item.key" class="wx-advice" :class="`tone-${item.tone}`" :title="item.title + '：' + item.detail">
          <component :is="adviceIcon(item.key, item.label)" :size="24" :stroke-width="1.6" class="wx-advice-icon" />
          <strong>{{ item.label }}</strong>
          <small>{{ item.detail }}</small>
        </div>
      </div>
    </section>

    <p v-if="!day.hours?.length" class="wx-note">暂无分时与实况数据（离线、缓存较旧或示例数据），指标按日级预报估算。</p>
  </div>
</template>

<style scoped>
.wx-detail {
  --wx-tile: color-mix(in srgb, var(--sage-bg) 70%, transparent);
  --wx-line: var(--line);
  --wx-high: #c87a38;
  --wx-humid: #5aa2dc;
  --wx-press: #5aa2dc;
  --wx-cold: #6ba4e0;
  --wx-mild: #6cbf7f;
  --wx-hot: #ef9a52;
  --wx-sun: #f2b84b;
  --wx-wind: #4c95d6;
  --wx-good: var(--accent);
  --wx-mind: #b7852f;
  --wx-warn: #c0584f;
  --wx-rain: #3b7080;
  display: flex;
  flex-direction: column;
  gap: 12px;
  container-type: inline-size;
  container-name: wx-detail;
}
.dark .wx-detail {
  --wx-tile: rgba(255, 255, 255, .045);
  --wx-high: #e59b5f;
  --wx-mind: #d8a85a;
  --wx-warn: #e08b82;
  --wx-rain: #8ac0d6;
}
.wx-block, .wx-tile { background: var(--wx-tile); border: 1px solid var(--wx-line); border-radius: 16px; }
.wx-block { padding: 12px 14px; min-width: 0; }
.wx-block-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: var(--ink); }
.wx-block-head small { font-size: 11.5px; font-weight: 400; color: var(--muted); }

.wx-hourly-scroll { overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--muted) 35%, transparent) transparent; margin: 0 -6px; padding: 0 6px 6px; }
.wx-hourly-scroll:focus-visible { outline: 2px solid var(--accent); border-radius: 10px; }
.wx-hourly-track { position: relative; }
.wx-hourly-curve { display: block; overflow: visible; }
.wx-curve-line { fill: none; stroke: var(--wx-high); stroke-width: 2; stroke-linecap: round; }
.wx-curve-label { font-size: 12.5px; font-weight: 600; fill: var(--ink); }
.wx-curve-label.now { fill: var(--wx-high); }
.wx-curve-now { fill: var(--glass-modal, #fff); stroke: var(--wx-high); stroke-width: 2; }
.wx-hours { display: flex; list-style: none; margin: 0; padding: 0; }
.wx-hour { width: 56px; flex: 0 0 56px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 0 2px; border-radius: 12px; }
.wx-hour.now { background: color-mix(in srgb, var(--accent) 9%, transparent); }
.wx-hour-icon { color: var(--secondary); margin-bottom: 2px; }
.wx-hour-icon.sunny { color: #c9a24c; }
.wx-hour-rain { font-size: 11px; font-weight: 600; color: var(--wx-rain); line-height: 1.3; }
.wx-hour-rain.empty { color: transparent; }
.wx-hour-wind { font-size: 11.5px; color: var(--secondary); }
.wx-hour-time { font-size: 11.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.wx-hour.now .wx-hour-time { color: var(--accent); font-weight: 600; }

.wx-precip { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.wx-precip-text { min-width: 0; }
.wx-precip small { font-size: 12px; color: var(--muted); }
.wx-precip strong { display: block; font-size: 18px; font-weight: 600; color: var(--ink); margin: 2px 0; }
.wx-precip p { font-size: 12.5px; color: var(--secondary); margin: 0; }
.wx-precip-icon { flex-shrink: 0; color: #d4a443; opacity: .9; }
.wx-precip.wet .wx-precip-icon { color: var(--wx-rain); }

.wx-tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.wx-tile { display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 10px 10px 10px 14px; min-width: 0; }
.wx-tile-text { display: flex; flex-direction: column; min-width: 0; }
.wx-tile-text small { font-size: 12px; color: var(--muted); white-space: nowrap; }
.wx-tile-text strong { font-size: 21px; font-weight: 600; color: var(--ink); line-height: 1.35; white-space: nowrap; font-variant-numeric: tabular-nums; }
.wx-tile-text span { font-size: 11.5px; color: var(--secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wx-gauge { width: 64px; height: 64px; flex-shrink: 0; overflow: visible; }
.g-track { fill: none; stroke-width: 5; stroke-linecap: round; }
.g-muted { stroke: var(--wx-line); }
.g-humid { stroke: var(--wx-humid); }
.g-press { stroke: var(--wx-press); opacity: .85; }
.g-cold { stroke: var(--wx-cold); }
.g-mild { stroke: var(--wx-mild); }
.g-hot { stroke: var(--wx-hot); }
.g-dot { fill: #fff; stroke: #e0a63c; stroke-width: 2; }
.g-value { font-size: 15px; font-weight: 600; fill: var(--ink); }
.g-caption { font-size: 9.5px; fill: var(--muted); }
.g-caption.small { font-size: 8px; }
.g-drop { fill: var(--wx-humid); }
.g-needle { stroke: var(--secondary); stroke-width: 2.4; stroke-linecap: round; }
.g-hub { fill: var(--glass-modal, #fff); stroke: var(--secondary); stroke-width: 2; }
.g-ring { fill: none; stroke: var(--wx-line); stroke-width: 1; }
.g-tick { stroke: var(--muted); stroke-width: 1; opacity: .55; }
.g-compass { font-size: 8px; fill: var(--muted); }
.g-wind { stroke: var(--wx-wind); stroke-width: 2; stroke-linecap: round; }
.g-wind-head { fill: var(--wx-wind); }
.g-horizon { stroke: var(--muted); stroke-width: .8; stroke-dasharray: 2 2; opacity: .6; }
.g-sun-path { fill: none; stroke: var(--wx-sun); stroke-width: 3; stroke-linecap: round; opacity: .75; }
.g-sun { fill: var(--wx-sun); stroke: #fff; stroke-width: 1.5; }
.g-arrow { fill: none; stroke: var(--wx-press); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }

.wx-advice-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.wx-advice { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 3px; padding: 10px 6px; border-radius: 12px; background: color-mix(in srgb, var(--surface) 70%, transparent); min-width: 0; }
.wx-advice-icon { color: var(--wx-good); margin-bottom: 2px; }
.wx-advice.tone-mind .wx-advice-icon { color: var(--wx-mind); }
.wx-advice.tone-warn .wx-advice-icon { color: var(--wx-warn); }
.wx-advice strong { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.wx-advice small { font-size: 11px; line-height: 1.45; color: var(--muted); }
.wx-note { font-size: 12px; color: var(--muted); margin: 0; }

/* 弹窗宽时：六项指标排成 3×2，出行建议排成一行 6 个 */
@container wx-detail (min-width: 760px) {
  .wx-tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .wx-advice-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
  .wx-precip { padding: 12px 18px; }
  .wx-precip-text { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
  .wx-precip strong { margin: 0; }
}
@container wx-detail (max-width: 480px) {
  .wx-tiles { gap: 8px; }
  .wx-tile { padding: 9px 6px 9px 11px; }
  .wx-tile-text strong { font-size: 18px; }
  .wx-gauge { width: 54px; height: 54px; }
  .wx-advice-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
