<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Sun, Moon, Settings, MapPin, Sparkles, ChevronDown } from 'lucide-vue-next'
import { getTodayCalendarInfo, type TodayCalendarInfo } from '../services/calendar'
import { DEFAULT_CITIES } from '../services/weather'
import type { CityOption } from '../types'

const props = defineProps<{
  selectedCity: CityOption
  theme: 'light' | 'dark' | 'auto'
}>()

const emit = defineEmits<{
  (e: 'update:city', city: CityOption): void
  (e: 'toggle-theme'): void
  (e: 'open-settings'): void
}>()

const calendarInfo = ref<TodayCalendarInfo>(getTodayCalendarInfo())
const timeStr = ref<string>('')
const showCityDropdown = ref(false)

function updateTime() {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  timeStr.value = `${h}:${m}`
}

let timer: number | undefined

onMounted(() => {
  updateTime()
  timer = window.setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function selectCity(c: CityOption) {
  emit('update:city', c)
  showCityDropdown.value = false
}
</script>

<template>
  <header class="w-full pt-8 pb-6 px-4 max-w-5xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6 select-none">
    <!-- Left: Date & Lunar Info -->
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center gap-3">
        <span class="inline-flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <Sparkles class="w-3 h-3" />
          DayBloom
        </span>
        <span class="text-sm font-semibold text-slate-500 dark:text-slate-400">
          {{ calendarInfo.termSummary }}
        </span>
      </div>

      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 class="text-3xl sm:text-4xl font-light tracking-tight text-slate-900 dark:text-white">
          {{ calendarInfo.solarDateStr }}
        </h1>
        <span class="text-lg sm:text-xl font-medium text-slate-600 dark:text-slate-300">
          {{ calendarInfo.dayOfWeek }}
        </span>
      </div>

      <div class="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span>农历{{ calendarInfo.lunarMonthStr }}{{ calendarInfo.lunarDayStr }}</span>
        <span class="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
        <span>{{ calendarInfo.ganzhiYear }}【{{ calendarInfo.zodiac }}年】</span>
        <span class="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
        <span class="text-emerald-600 dark:text-emerald-400 font-medium">{{ calendarInfo.solarTerm }}</span>
      </div>
    </div>

    <!-- Right: City selector, Time, and Actions -->
    <div class="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto">
      <!-- City Switcher -->
      <div class="relative">
        <button
          @click="showCityDropdown = !showCityDropdown"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
        >
          <MapPin class="w-3.5 h-3.5 text-slate-400" />
          <span>{{ selectedCity.name }}</span>
          <ChevronDown class="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        </button>

        <!-- Dropdown menu -->
        <div
          v-if="showCityDropdown"
          class="absolute right-0 mt-1.5 w-40 max-h-60 overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-1.5"
        >
          <button
            v-for="c in DEFAULT_CITIES"
            :key="c.name"
            @click="selectCity(c)"
            class="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-between"
            :class="{ 'text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50/50 dark:bg-emerald-950/20': c.name === selectedCity.name }"
          >
            <span>{{ c.name }}</span>
            <span class="text-[10px] text-slate-400">{{ c.province }}</span>
          </button>
        </div>
      </div>

      <!-- Clock badge -->
      <div class="px-3.5 py-1 rounded-xl text-sm font-mono font-medium text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        {{ timeStr }}
      </div>

      <!-- Theme button -->
      <button
        @click="emit('toggle-theme')"
        title="切换明暗色彩模式"
        class="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
      >
        <Sun v-if="theme === 'dark'" class="w-4 h-4 text-amber-400" />
        <Moon v-else class="w-4 h-4 text-slate-600" />
      </button>

      <!-- Settings button -->
      <button
        @click="emit('open-settings')"
        title="设置与个性化"
        class="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
      >
        <Settings class="w-4 h-4" />
      </button>
    </div>
  </header>
</template>
