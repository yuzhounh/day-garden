<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import HeaderHero from './components/HeaderHero.vue'
import WeatherTimeline from './components/WeatherTimeline.vue'
import UpcomingTimeline from './components/UpcomingTimeline.vue'
import SeasonalCard from './components/SeasonalCard.vue'
import EvidenceCard from './components/EvidenceCard.vue'
import DailyPageCard from './components/DailyPageCard.vue'
import HealthTipBar from './components/HealthTipBar.vue'
import SettingsModal from './components/SettingsModal.vue'

import type { UserPreferences, WeatherDay, CityOption, CuratedPoetry, HealthTip } from './types'
import { fetch7DayWeather } from './services/weather'
import { getUpcomingEvents, sendDesktopNotification } from './services/calendar'
import {
  loadUserPreferences,
  saveUserPreferences,
  getTodaySeasonBloom,
  getTodayEvidenceGuide,
  getTodayPoetry,
  getTodayHealthTip,
} from './services/storage'
import rawPoetry from './data/poetry-curated.json'
import rawHealthTips from './data/health-tips.json'

// 状态管理
const prefs = ref<UserPreferences>(loadUserPreferences())
const weatherDays = ref<WeatherDay[]>([])
const weatherLoading = ref(false)
const showSettings = ref(false)

// 当日内容状态
const seasonBloom = ref(getTodaySeasonBloom())
const evidenceGuide = ref(getTodayEvidenceGuide())
const currentPoetry = ref<CuratedPoetry>(getTodayPoetry())
const currentHealthTip = ref<HealthTip>(getTodayHealthTip())

// 计算即将到来的事件
const upcomingEvents = computed(() => {
  return getUpcomingEvents(prefs.value.customEvents, 30)
})

// 主题切换
function applyTheme(theme: 'light' | 'dark' | 'auto') {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')
  }
}

function toggleTheme() {
  const next = prefs.value.theme === 'dark' ? 'light' : 'dark'
  prefs.value.theme = next
  applyTheme(next)
  saveUserPreferences(prefs.value)
}

function handleCityChange(city: CityOption) {
  prefs.value.selectedCity = city
  saveUserPreferences(prefs.value)
  loadWeather()
}

function handleUpdatePreferences(newPrefs: UserPreferences) {
  prefs.value = newPrefs
  saveUserPreferences(newPrefs)
  applyTheme(newPrefs.theme)
}

async function loadWeather() {
  weatherLoading.value = true
  try {
    weatherDays.value = await fetch7DayWeather(prefs.value.selectedCity)
  } finally {
    weatherLoading.value = false
  }
}

// 换一首诗词
let poetryOffset = 0
function handleNextPoetry() {
  poetryOffset++
  const list = rawPoetry as CuratedPoetry[]
  const nextIdx = (list.findIndex((p) => p.id === currentPoetry.value.id) + 1) % list.length
  currentPoetry.value = list[nextIdx]
}

// 换一个微建议
function handleNextTip() {
  const list = rawHealthTips as HealthTip[]
  const nextIdx = (list.findIndex((t) => t.id === currentHealthTip.value.id) + 1) % list.length
  currentHealthTip.value = list[nextIdx]
}

// 检查生日预警通知
function checkBirthdayAlerts() {
  const todayEvents = upcomingEvents.value.filter((e) => e.daysLeft === 0)
  const urgentEvents = upcomingEvents.value.filter((e) => e.daysLeft !== undefined && e.daysLeft > 0 && e.daysLeft <= 3)

  if (todayEvents.length > 0) {
    const ev = todayEvents[0]
    sendDesktopNotification('DayBloom 生日祝福', `🎂 今天是【${ev.title}】，别忘了送上祝福！`)
  } else if (urgentEvents.length > 0) {
    const ev = urgentEvents[0]
    sendDesktopNotification('DayBloom 日程预警', `⏰【${ev.title}】还有 ${ev.daysLeft} 天，记得确认准备情况。`)
  }
}

onMounted(() => {
  applyTheme(prefs.value.theme)
  loadWeather()
  checkBirthdayAlerts()

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (prefs.value.theme === 'auto') {
      applyTheme('auto')
    }
  })
})
</script>

<template>
  <div class="min-h-screen flex flex-col justify-between selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-300">
    <!-- Top Decorative Glow -->
    <div class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-48 bg-gradient-to-b from-emerald-500/5 via-sky-500/5 to-transparent pointer-events-none blur-3xl -z-10"></div>

    <!-- Main Container -->
    <div class="w-full flex-grow flex flex-col pb-8">
      <!-- 1. Header Hero -->
      <HeaderHero
        :selectedCity="prefs.selectedCity"
        :theme="prefs.theme"
        @update:city="handleCityChange"
        @toggle-theme="toggleTheme"
        @open-settings="showSettings = true"
      />

      <!-- 2. Weather Timeline (7 Days) -->
      <WeatherTimeline
        v-if="prefs.modules.weather"
        :days="weatherDays"
        :loading="weatherLoading"
      />

      <!-- 3. Primary Dashboard Cards Grid (Upcoming & Seasonal) -->
      <main class="w-full max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <!-- Upcoming Events & Birthdays -->
        <UpcomingTimeline
          v-if="prefs.modules.upcoming"
          :events="upcomingEvents"
          @add-event="showSettings = true"
          @test-notification="checkBirthdayAlerts"
        />

        <!-- Seasonal & Bloom -->
        <SeasonalCard
          v-if="prefs.modules.seasonal"
          :bloom="seasonBloom"
        />
      </main>

      <!-- 4. Secondary Inspiration Cards Grid (Evidence & Daily Poetry) -->
      <div class="w-full max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Evidence-Based Guide (HowToLiveBetter) -->
        <EvidenceCard
          v-if="prefs.modules.evidence"
          :guide="evidenceGuide"
        />

        <!-- Daily Classic Poetry -->
        <DailyPageCard
          v-if="prefs.modules.dailyPoetry"
          :poetry="currentPoetry"
          @next-poetry="handleNextPoetry"
        />
      </div>

      <!-- 5. Bottom Health Tip Bar -->
      <HealthTipBar
        v-if="prefs.modules.healthTip"
        :tip="currentHealthTip"
        @next-tip="handleNextTip"
      />
    </div>

    <!-- Footer -->
    <footer class="w-full py-6 text-center text-xs text-slate-400 select-none">
      <div class="flex items-center justify-center gap-2">
        <span>DayBloom</span>
        <span>·</span>
        <span>低干扰个人生活主页</span>
        <span>·</span>
        <span>清晨30秒，静心笃行</span>
      </div>
    </footer>

    <!-- Settings & Customization Modal -->
    <SettingsModal
      v-if="showSettings"
      :preferences="prefs"
      @close="showSettings = false"
      @update:preferences="handleUpdatePreferences"
    />
  </div>
</template>
