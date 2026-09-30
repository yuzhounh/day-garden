<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Sun, Moon, Settings2, MapPin, ChevronDown, Sprout, Check, ArrowUpRight, Cloud, UserRound } from 'lucide-vue-next'
import { getTodayCalendarInfo } from '../services/calendar'
import { DEFAULT_CITIES } from '../services/weather'
import BotanicalArt from './BotanicalArt.vue'
import type { CityOption } from '../types'
import { account } from '../services/sync'

const props = defineProps<{ selectedCity: CityOption; theme: 'light' | 'dark' | 'auto' }>()
const emit = defineEmits<{ 'update:city': [city: CityOption]; 'toggle-theme': []; 'open-settings': []; 'open-account': [] }>()
const now = ref(new Date())
const calendar = computed(() => getTodayCalendarInfo(now.value))
const time = computed(() => now.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }))
const greeting = computed(() => {
  const hour = now.value.getHours()
  return hour < 6 ? '夜深了，给自己一点安静。' : hour < 11 ? '早安，让美好慢慢发生。' : hour < 14 ? '午安，留一点时间给自己。' : hour < 18 ? '下午好，日子正在发光。' : '晚上好，把日子过成诗。'
})
const isDark = computed(() => props.theme === 'dark' || (props.theme === 'auto' && systemDark.value))
const systemDark = ref(false)
const showCities = ref(false)
const cityMenu = ref<HTMLElement | null>(null)
let timer: number | undefined
function closeCities(event: MouseEvent) {
  if (!cityMenu.value?.contains(event.target as Node)) showCities.value = false
}
function onKey(event: KeyboardEvent) { if (event.key === 'Escape') showCities.value = false }
function selectCity(city: CityOption) { emit('update:city', city); showCities.value = false }
function updateSystem(event: MediaQueryListEvent) { systemDark.value = event.matches }
onMounted(() => {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = query.matches
  query.addEventListener('change', updateSystem)
  timer = window.setInterval(() => { now.value = new Date() }, 30000)
  document.addEventListener('click', closeCities)
  document.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  clearInterval(timer)
  window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', updateSystem)
  document.removeEventListener('click', closeCities)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <header class="garden-header">
    <div class="topbar">
      <a class="brand" href="#today" aria-label="Day Garden 首页">
        <span class="brand-symbol"><Sprout :size="23" :stroke-width="1.5" /></span>
        <span>Day Garden<small>日 常 花 园</small></span>
      </a>
      <div class="header-actions">
        <div ref="cityMenu" class="city-control">
          <button class="toolbar-button" :aria-expanded="showCities" aria-controls="city-options" @click="showCities = !showCities">
            <MapPin :size="14" /><span>{{ selectedCity.name }}</span><ChevronDown :size="12" />
          </button>
          <div v-if="showCities" id="city-options" class="city-menu glass-panel">
            <p class="eyebrow">选择你的城市</p>
            <button v-for="city in DEFAULT_CITIES" :key="city.name" :aria-pressed="city.name === selectedCity.name" @click="selectCity(city)">
              <span>{{ city.name }}<small>{{ city.province }}</small></span><Check v-if="city.name === selectedCity.name" :size="14" />
            </button>
          </div>
        </div>
        <span class="live-clock">{{ time }}</span>
        <span class="toolbar-divider"></span>
        <button class="toolbar-button account-button" aria-label="账户与云端同步" @click="emit('open-account')"><Cloud v-if="account.user" :size="15" /><UserRound v-else :size="15" /><span>{{ account.user ? account.status === 'synced' ? '已同步' : '本机已保存' : '我的花园' }}</span></button>
        <button class="icon-button" :aria-label="isDark ? '切换浅色模式' : '切换深色模式'" @click="emit('toggle-theme')"><Sun v-if="isDark" :size="17" /><Moon v-else :size="17" /></button>
        <button class="icon-button" aria-label="设置与个性化" @click="emit('open-settings')"><Settings2 :size="17" /></button>
      </div>
    </div>
    <div class="hero-intro">
      <div class="hero-copy">
        <p class="eyebrow"><span class="status-dot"></span> A LITTLE SPACE FOR EVERYDAY LIFE</p>
        <h1>{{ greeting }}</h1>
        <p class="hero-description">感受四时流转，照顾日常，也收藏一点诗意。</p>
        <div class="season-note"><Sprout :size="14" /><span>{{ calendar.termSummary }}</span><ArrowUpRight :size="13" /></div>
      </div>
      <div class="hero-botanical"><BotanicalArt /><span>一枝一叶，都是生活。</span></div>
      <div class="date-card glass-panel">
        <span>{{ now.getFullYear() }} / {{ String(now.getMonth() + 1).padStart(2, '0') }}</span>
        <strong>{{ String(now.getDate()).padStart(2, '0') }}</strong>
        <span>{{ calendar.dayOfWeek }}</span>
        <div>农历 {{ calendar.lunarMonthStr }}{{ calendar.lunarDayStr }}</div>
      </div>
    </div>
  </header>
</template>
