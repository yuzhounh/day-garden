<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  CloudDrizzle,
  Umbrella,
  Thermometer,
  Wind,
  ArrowUpRight,
} from 'lucide-vue-next'
import type { WeatherDay } from '../types'
import DetailModal from './DetailModal.vue'

const props = defineProps<{ days: WeatherDay[]; loading?: boolean; city: string }>()
const selected = ref<WeatherDay | null>(null)
const today = computed(() => props.days.find(day => day.isToday))
const source = computed(() =>
  props.loading
    ? '正在更新天气'
    : props.days[0]?.dataSource === 'demo'
    ? '示例天气'
    : props.days[0]?.dataSource === 'cached'
    ? '缓存天气'
    : 'Open-Meteo'
)
const weatherHint = computed(() =>
  today.value?.precipProb && today.value.precipProb >= 40
    ? '出门记得带伞，给雨天留一点从容。'
    : today.value && today.value.tempMax - today.value.tempMin >= 8
    ? '早晚温差较大，带一件薄外套。'
    : '出门前看一眼天气，从容安排今天。'
)
const icons = { Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudDrizzle }
function icon(name: string) {
  return icons[name as keyof typeof icons] || CloudSun
}
function shortDate(date: string) {
  return Number(date.slice(5, 7)) + '/' + Number(date.slice(8, 10))
}
function uvLevel(value?: number) {
  return value === undefined
    ? '暂无数据'
    : value <= 2
    ? '低'
    : value <= 5
    ? '中等'
    : value <= 7
    ? '高'
    : value <= 10
    ? '很高'
    : '极高'
}

function getDayTitle(day: WeatherDay): string {
  if (day.isToday) return '今天'
  const todayIdx = props.days.findIndex(d => d.isToday)
  const currentIdx = props.days.findIndex(d => d.date === day.date)
  if (todayIdx !== -1 && currentIdx !== -1) {
    if (currentIdx === todayIdx - 1) return '昨天'
    if (currentIdx === todayIdx - 2) return '前天'
    if (currentIdx === todayIdx + 1) return '明天'
    if (currentIdx === todayIdx + 2) return '后天'
  }
  return day.dayOfWeek
}

// 动态根据天气区域宽度自适应列数，杜绝横向挤压与横向滚动条
const forecastAreaRef = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
let ro: ResizeObserver | null = null

onMounted(() => {
  if (forecastAreaRef.value) {
    containerWidth.value = forecastAreaRef.value.clientWidth
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver((entries) => {
        window.requestAnimationFrame(() => {
          for (const entry of entries) {
            if (entry.contentRect.width > 0) {
              containerWidth.value = entry.contentRect.width
            }
          }
        })
      })
      ro.observe(forecastAreaRef.value)
    }
  }
})

onUnmounted(() => {
  if (ro) {
    ro.disconnect()
    ro = null
  }
})

const visibleCount = computed(() => {
  const total = props.days.length
  if (!total) return 0
  const width = containerWidth.value
  if (!width) {
    if (typeof window !== 'undefined' && window.innerWidth) {
      const estWidth = window.innerWidth <= 720 ? window.innerWidth - 60 : 600
      return Math.min(total, Math.max(3, Math.floor((estWidth + 4) / 60)))
    }
    return total
  }
  // 每列约 56px 加上 4px 间隙 = 60px
  const count = Math.floor((width + 4) / 60)
  return Math.min(total, Math.max(3, count))
})

const visibleDays = computed(() => {
  if (!props.days || props.days.length === 0) return []
  const count = visibleCount.value
  if (count >= props.days.length) return props.days

  const todayIdx = props.days.findIndex(d => d.isToday)
  if (todayIdx === -1) {
    return props.days.slice(0, count)
  }

  // 保证包含“今天”；列数充裕时保留“昨天”或“前天”，其余空间留给未来预报
  let pastDaysWanted = 0
  if (count >= 10 && todayIdx >= 2) {
    pastDaysWanted = 2
  } else if (count >= 4 && todayIdx >= 1) {
    pastDaysWanted = 1
  }

  const actualPast = Math.min(pastDaysWanted, todayIdx)
  const startIdx = todayIdx - actualPast
  let endIdx = startIdx + count

  if (endIdx > props.days.length) {
    endIdx = props.days.length
    const adjustedStart = Math.max(0, endIdx - count)
    return props.days.slice(adjustedStart, endIdx)
  }

  return props.days.slice(startIdx, endIdx)
})

const forecastSubtitle = computed(() => {
  if (!visibleDays.value.length) return ''
  const pastDays = visibleDays.value.filter(d => d.isPast).length
  const futureDays = visibleDays.value.filter(d => !d.isPast && !d.isToday).length
  const parts: string[] = []
  if (pastDays >= 2) parts.push('前两天')
  else if (pastDays === 1) parts.push('昨天')
  parts.push('今天')
  if (futureDays === 1) parts.push('明天')
  else if (futureDays === 2) parts.push('未来 2 天')
  else if (futureDays > 2) parts.push(`未来 ${futureDays} 天`)
  return parts.join(' · ')
})

interface ChartPoint {
  x: number
  yMax: number
  yMin: number
  tempMax: number
  tempMin: number
  date: string
}

function buildSpline(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = i < points.length - 2 ? points[i + 2] : p2

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x} ${p2.y}`
  }
  return d
}

const chartData = computed(() => {
  const currentDays = visibleDays.value
  if (!currentDays || currentDays.length === 0) return null
  const count = currentDays.length
  const colWidth = 90
  const totalWidth = count * colWidth

  const allMin = currentDays.map(d => d.tempMin)
  const allMax = currentDays.map(d => d.tempMax)
  let minTemp = Math.min(...allMin)
  let maxTemp = Math.max(...allMax)

  // Ensure minimum temperature range of 6 degrees for clear curvature
  const diff = maxTemp - minTemp
  if (diff < 6) {
    const pad = Math.ceil((6 - diff) / 2)
    minTemp -= pad
    maxTemp += pad
  }

  const chartHeight = 130
  const topPad = 32
  const botPad = 32
  const availHeight = chartHeight - topPad - botPad

  const points: ChartPoint[] = currentDays.map((d, i) => {
    const x = Math.round(i * colWidth + colWidth / 2)
    const yMax = Math.round(topPad + ((maxTemp - d.tempMax) / (maxTemp - minTemp)) * availHeight)
    const yMin = Math.round(topPad + ((maxTemp - d.tempMin) / (maxTemp - minTemp)) * availHeight)
    return {
      x,
      yMax,
      yMin,
      tempMax: d.tempMax,
      tempMin: d.tempMin,
      date: d.date,
    }
  })

  const maxPoints = points.map(p => ({ x: p.x, y: p.yMax }))
  const minPoints = points.map(p => ({ x: p.x, y: p.yMin }))

  const maxPath = buildSpline(maxPoints)
  const minPath = buildSpline(minPoints)

  return {
    points,
    maxPath,
    minPath,
    viewBox: `0 0 ${totalWidth} ${chartHeight}`,
  }
})
</script>

<template>
  <section class="glass-panel weather-panel" aria-label="七日天气">
    <div class="weather-summary">
      <div class="summary-header">
        <span class="eyebrow">天气 · 刚刚好</span>
        <span class="summary-city">{{ city }}</span>
      </div>

      <div v-if="today" class="today-content">
        <div class="today-main">
          <strong class="today-temp">{{ today.tempMax }}<span>°</span></strong>
          <component :is="icon(today.iconName)" :size="46" :stroke-width="1.35" class="today-icon" />
        </div>
        <div class="today-condition-bar">
          <span class="today-condition-text">{{ today.weatherText }}</span>
          <span class="today-condition-dot">·</span>
          <span class="today-range">{{ today.tempMin }}° ~ {{ today.tempMax }}°</span>
        </div>
        <div class="today-sub-tags">
          <div class="today-tag" title="最高体感温度">
            <span class="today-tag-label"><Thermometer :size="13" />体感温度</span>
            <strong class="today-tag-val">{{ today.apparentTempMax }}°</strong>
          </div>
          <div v-if="today.precipProb > 0" class="today-tag" title="降水概率">
            <span class="today-tag-label"><Umbrella :size="13" />降水概率</span>
            <strong class="today-tag-val">{{ today.precipProb }}%</strong>
          </div>
          <div v-else class="today-tag" title="紫外线指数">
            <span class="today-tag-label"><Sun :size="13" />紫外线指数</span>
            <strong class="today-tag-val">{{ uvLevel(today.uvIndex) }}</strong>
          </div>
        </div>
      </div>
      <div v-else class="weather-placeholder">{{ loading ? '正在感受城市的天气…' : '天气暂不可用' }}</div>

      <p class="today-hint">{{ weatherHint }}</p>
    </div>

    <div ref="forecastAreaRef" class="forecast-area">
      <div class="forecast-heading">
        <span>气温流转趋势<small>{{ forecastSubtitle }}</small></span>
        <span role="status">
          <a
            v-if="source === 'Open-Meteo'"
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            class="weather-source-link"
            title="数据来源于 Open-Meteo 气象预报服务（点击访问官方网站）"
          >
            Open-Meteo
            <ArrowUpRight :size="12" />
          </a>
          <span v-else>{{ source }}</span>
        </span>
      </div>

      <div v-if="loading && !days.length" class="trend-scroll-container" aria-label="正在加载">
        <div class="forecast-grid">
          <div v-for="n in 10" :key="n" class="weather-skeleton"></div>
        </div>
      </div>

      <div v-else-if="chartData" class="trend-scroll-container">
        <div class="trend-grid-wrapper" :style="{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }">
          <!-- background clickable columns spanning full height -->
          <button
            v-for="(day, idx) in visibleDays"
            :key="'card-' + day.date"
            class="trend-col-card"
            :class="{ today: day.isToday, past: day.isPast }"
            :style="{ gridColumn: idx + 1 }"
            :aria-label="day.dayOfWeek + ' ' + shortDate(day.date) + ' ' + day.weatherText + ' ' + day.tempMin + '至' + day.tempMax + '度，查看详情'"
            @click="selected = day"
          ></button>

          <!-- Row 1: Day header, date, weather icon and condition text -->
          <div
            v-for="(day, idx) in visibleDays"
            :key="'top-' + day.date"
            class="trend-cell-top"
            :style="{ gridColumn: idx + 1 }"
          >
            <strong class="trend-day-name">{{ getDayTitle(day) }}</strong>
            <span class="trend-date-text">{{ shortDate(day.date) }}</span>
            <component
              :is="icon(day.iconName)"
              :size="24"
              :stroke-width="1.4"
              class="trend-icon"
              :class="{ sunny: day.iconName === 'Sun' || day.iconName === 'CloudSun' }"
            />
            <span class="trend-condition">{{ day.weatherText }}</span>
          </div>

          <!-- Row 2: Smooth temperature trend curves -->
          <div class="trend-cell-chart">
            <svg :viewBox="chartData.viewBox" preserveAspectRatio="none" class="trend-svg-canvas">
              <!-- High temperature curve -->
              <path :d="chartData.maxPath" class="trend-curve-high" />
              <!-- Low temperature curve -->
              <path :d="chartData.minPath" class="trend-curve-low" />

              <!-- Points and temperature labels -->
              <g v-for="pt in chartData.points" :key="'pt-' + pt.date">
                <!-- High temp dot & number -->
                <circle :cx="pt.x" :cy="pt.yMax" r="4" class="trend-point-high" />
                <circle :cx="pt.x" :cy="pt.yMax" r="2" class="trend-point-core" />
                <text :x="pt.x" :y="pt.yMax - 10" text-anchor="middle" class="trend-label-high">
                  {{ pt.tempMax }}°
                </text>

                <!-- Low temp dot & number -->
                <circle :cx="pt.x" :cy="pt.yMin" r="4" class="trend-point-low" />
                <circle :cx="pt.x" :cy="pt.yMin" r="2" class="trend-point-core" />
                <text :x="pt.x" :y="pt.yMin + 20" text-anchor="middle" class="trend-label-low">
                  {{ pt.tempMin }}°
                </text>
              </g>
            </svg>
          </div>

          <!-- Row 3: Bottom info (precipitation chance) -->
          <div
            v-for="(day, idx) in visibleDays"
            :key="'bot-' + day.date"
            class="trend-cell-bot"
            :style="{ gridColumn: idx + 1 }"
          >
            <span v-if="day.precipProb > 0" class="trend-precip-tag has-rain">
              <Umbrella :size="11" />{{ day.precipProb }}%
            </span>
            <span v-else class="trend-precip-tag no-rain">
              无雨
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal details -->
    <DetailModal
      v-if="selected"
      :title="selected.dayOfWeek + ' · ' + selected.weatherText"
      :subtitle="city + ' / ' + selected.date + (selected.dataSource === 'demo' ? ' / 示例数据' : selected.dataSource === 'cached' ? ' / 缓存数据' : '')"
      @close="selected = null"
    >
      <div class="weather-details">
        <div>
          <Thermometer :size="20" />
          <small>最高 / 最低温度</small>
          <strong>{{ selected.tempMax }}° / {{ selected.tempMin }}°</strong>
        </div>
        <div>
          <Wind :size="20" />
          <small>最高 / 最低体感</small>
          <strong>{{ selected.apparentTempMax }}° / {{ selected.apparentTempMin }}°</strong>
        </div>
        <div>
          <Umbrella :size="20" />
          <small>降水概率</small>
          <strong>{{ selected.precipProb }}%</strong>
        </div>
        <div>
          <Sun :size="20" />
          <small>紫外线指数</small>
          <strong>{{ selected.uvIndex ?? '—' }} · {{ uvLevel(selected.uvIndex) }}</strong>
        </div>
      </div>
      <p class="content-footnote">
        {{ selected.isPast ? '历史天气供回顾参考。' : '日级预报供出行参考，实际天气可能变化。' }}
        {{ selected.dataSource === 'demo' ? '当前为示例数据，不能作为出行依据。' : '' }}
        气象数据源自
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
          class="weather-source-link"
          title="访问 Open-Meteo 官方网站"
        >
          Open-Meteo
          <ArrowUpRight :size="12" />
        </a>。
      </p>
    </DetailModal>
  </section>
</template>
