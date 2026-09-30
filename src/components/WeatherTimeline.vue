<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudDrizzle, Umbrella, Thermometer, Wind } from 'lucide-vue-next'
import type { WeatherDay } from '../types'
import DetailModal from './DetailModal.vue'
const props = defineProps<{ days: WeatherDay[]; loading?: boolean; city: string }>()
const selected = ref<WeatherDay | null>(null)
const today = computed(() => props.days.find(day => day.isToday))
const source = computed(() => props.loading ? '正在更新天气' : props.days[0]?.dataSource === 'demo' ? '示例天气' : props.days[0]?.dataSource === 'cached' ? '缓存天气' : 'Open-Meteo')
const weatherHint = computed(() => today.value?.precipProb && today.value.precipProb >= 40 ? '出门记得带伞，给雨天留一点从容。' : today.value && today.value.tempMax - today.value.tempMin >= 8 ? '早晚温差较大，带一件薄外套。' : '出门前看一眼天气，从容安排今天。')
const icons = { Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, CloudFog, CloudDrizzle }
function icon(name: string) { return icons[name as keyof typeof icons] || CloudSun }
function shortDate(date: string) { return Number(date.slice(5, 7)) + '/' + Number(date.slice(8, 10)) }
function uvLevel(value?: number) { return value === undefined ? '暂无数据' : value <= 2 ? '低' : value <= 5 ? '中等' : value <= 7 ? '高' : value <= 10 ? '很高' : '极高' }
</script>

<template>
  <section class="glass-panel weather-panel" aria-label="七日天气">
    <div class="weather-summary">
      <span class="eyebrow">天气，刚刚好</span>
      <div v-if="today" class="today-weather"><component :is="icon(today.iconName)" :size="38" :stroke-width="1.3" /><strong>{{ today.tempMax }}<span>°</span></strong><div><span>{{ city }}</span><small>{{ today.weatherText }} · {{ today.tempMin }}° — {{ today.tempMax }}°</small></div></div>
      <div v-else class="weather-placeholder">{{ loading ? '正在感受城市的天气…' : '天气暂不可用' }}</div>
      <p>{{ weatherHint }}</p>
    </div>
    <div class="forecast-area">
      <div class="forecast-heading"><span>七日流转<small>前两天 · 今天 · 后四天</small></span><span role="status">{{ source }}</span></div>
      <div v-if="loading && !days.length" class="forecast-grid" aria-label="正在加载"><div v-for="n in 7" :key="n" class="weather-skeleton"></div></div>
      <div v-else class="forecast-grid"><button v-for="day in days" :key="day.date" class="forecast-day" :class="{ today: day.isToday, past: day.isPast }" :aria-label="day.dayOfWeek + ' ' + shortDate(day.date) + ' ' + day.weatherText + ' ' + day.tempMin + '至' + day.tempMax + '度，查看详情'" @click="selected = day">
        <strong>{{ day.dayOfWeek }}</strong><small>{{ shortDate(day.date) }}</small><component :is="icon(day.iconName)" :size="24" :stroke-width="1.4" :class="{ sunny: day.iconName === 'Sun' || day.iconName === 'CloudSun' }" /><span>{{ day.tempMax }}° <em>{{ day.tempMin }}°</em></span>
      </button></div>
    </div>
    <DetailModal v-if="selected" :title="selected.dayOfWeek + ' · ' + selected.weatherText" :subtitle="city + ' / ' + selected.date + (selected.dataSource === 'demo' ? ' / 示例数据' : selected.dataSource === 'cached' ? ' / 缓存数据' : '')" @close="selected = null">
      <div class="weather-details"><div><Thermometer :size="19" /><small>最高 / 最低温度</small><strong>{{ selected.tempMax }}° / {{ selected.tempMin }}°</strong></div><div><Wind :size="19" /><small>最高 / 最低体感</small><strong>{{ selected.apparentTempMax }}° / {{ selected.apparentTempMin }}°</strong></div><div><Umbrella :size="19" /><small>降水概率</small><strong>{{ selected.precipProb }}%</strong></div><div><Sun :size="19" /><small>紫外线指数</small><strong>{{ selected.uvIndex ?? '—' }} · {{ uvLevel(selected.uvIndex) }}</strong></div></div>
      <p class="content-footnote">{{ selected.isPast ? '历史天气供回顾参考。' : '日级预报供出行参考，实际天气可能变化。' }}{{ selected.dataSource === 'demo' ? '当前为示例数据，不能作为出行依据。' : '' }}</p>
    </DetailModal>
  </section>
</template>
