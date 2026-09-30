<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { LayoutGrid, Flower2, Heart, Sprout } from 'lucide-vue-next'
import HeaderHero from './components/HeaderHero.vue'
import WeatherTimeline from './components/WeatherTimeline.vue'
import MonthCalendarCard from './components/MonthCalendarCard.vue'
import UpcomingTimeline from './components/UpcomingTimeline.vue'
import SeasonalCard from './components/SeasonalCard.vue'
import EvidenceCard from './components/EvidenceCard.vue'
import DailyPageCard from './components/DailyPageCard.vue'
import HealthTipBar from './components/HealthTipBar.vue'
import SettingsModal from './components/SettingsModal.vue'
import AccountModal from './components/AccountModal.vue'
import { initializeSync, refreshCloud } from './services/sync'
import type { UserPreferences, WeatherDay, CityOption, CuratedPoetry, HealthTip, EvidenceGuide } from './types'
import { fetch7DayWeather } from './services/weather'
import { getUpcomingEvents, sendDesktopNotification } from './services/calendar'
import { loadUserPreferences, saveUserPreferences, getTodaySeasonBloom, getTodayEvidenceGuide, getTodayPoetry, getTodayHealthTip } from './services/storage'
import { localDateKey } from './services/day'
import rawPoetry from './data/poetry-curated.json'
import rawHealthTips from './data/health-tips.json'
import rawEvidence from './data/evidence-guide.json'

const prefs = ref<UserPreferences>(loadUserPreferences())
const weatherDays = ref<WeatherDay[]>([])
const weatherLoading = ref(false)
const showSettings = ref(false)
const showAccount = ref(false)
const settingsTab = ref<'modules' | 'events' | 'notification'>('modules')
const activeSection = ref('today')
const dateKey = ref(localDateKey())
const seasonBloom = ref(getTodaySeasonBloom())
const evidenceGuide = ref(getTodayEvidenceGuide())
const currentPoetry = ref<CuratedPoetry>(getTodayPoetry())
const currentHealthTip = ref<HealthTip>(getTodayHealthTip())
const upcomingEvents = computed(() => {
  void dateKey.value
  return getUpcomingEvents(prefs.value.customEvents, 30)
})
function applyTheme(theme: UserPreferences['theme']) {
  document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches))
}
function toggleTheme() {
  prefs.value.theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
  applyTheme(prefs.value.theme)
  saveUserPreferences(prefs.value)
}
function handleCityChange(city: CityOption) {
  prefs.value.selectedCity = city
  saveUserPreferences(prefs.value)
  loadWeather()
}
function handleUpdatePreferences(newPrefs: UserPreferences) {
  const cityChanged = newPrefs.selectedCity.name !== prefs.value.selectedCity.name
  prefs.value = newPrefs
  saveUserPreferences(newPrefs)
  applyTheme(newPrefs.theme)
  if (cityChanged) loadWeather()
}
let weatherRequest = 0
async function loadWeather() {
  const request = ++weatherRequest
  weatherLoading.value = true
  weatherDays.value = []
  try {
    const result = await fetch7DayWeather(prefs.value.selectedCity)
    if (request === weatherRequest) weatherDays.value = result
  } finally {
    if (request === weatherRequest) weatherLoading.value = false
  }
}
function handleNextPoetry() {
  const list = rawPoetry as CuratedPoetry[]
  currentPoetry.value = list[(list.findIndex(p => p.id === currentPoetry.value.id) + 1) % list.length]
}
function handleNextTip() {
  const list = rawHealthTips as HealthTip[]
  currentHealthTip.value = list[(list.findIndex(t => t.id === currentHealthTip.value.id) + 1) % list.length]
}
function handleNextGuide() {
  const list = rawEvidence as EvidenceGuide[]
  evidenceGuide.value = list[(list.findIndex(g => g.id === evidenceGuide.value.id) + 1) % list.length]
}
function openSettings(tab: typeof settingsTab.value = 'modules') { settingsTab.value = tab; showSettings.value = true }
function checkBirthdayAlerts() {
  if (!prefs.value.notificationEnabled) return
  const event = upcomingEvents.value.find(e => e.type !== 'holiday' && (e.daysLeft === 0 || e.daysLeft === 3 || e.daysLeft === 14))
  if (event) sendDesktopNotification('Day Garden · 重要日子', event.daysLeft === 0 ? '今天是' + event.title + '，记得送上祝福。' : event.title + '还有 ' + event.daysLeft + ' 天，可以开始准备了。')
}
function syncDate() {
  const nextDate = localDateKey()
  if (dateKey.value === nextDate) return
  dateKey.value = nextDate
  seasonBloom.value = getTodaySeasonBloom()
  evidenceGuide.value = getTodayEvidenceGuide()
  currentPoetry.value = getTodayPoetry()
  currentHealthTip.value = getTodayHealthTip()
  loadWeather()
  checkBirthdayAlerts()
}
function handleSystemTheme() { if (prefs.value.theme === 'auto') applyTheme('auto') }
function handleVisibility() { syncDate(); if (!document.hidden) void refreshCloud() }
function handleOnline() { void refreshCloud() }
let dayTimer: number | undefined
onMounted(() => {
  applyTheme(prefs.value.theme)
  loadWeather()
  checkBirthdayAlerts()
  void initializeSync()
  dayTimer = window.setInterval(syncDate, 30000)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemTheme)
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('online', handleOnline)
})
onUnmounted(() => {
  clearInterval(dayTimer)
  window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handleSystemTheme)
  document.removeEventListener('visibilitychange', handleVisibility)
  window.removeEventListener('online', handleOnline)
})
</script>

<template>
  <div id="today" class="garden-app">
    <div class="ambient-background" aria-hidden="true"><span class="ambient-sage"></span><span class="ambient-peach"></span><span class="ambient-lavender"></span></div>
    <div class="garden-shell">
      <HeaderHero :selected-city="prefs.selectedCity" :theme="prefs.theme" @update:city="handleCityChange" @toggle-theme="toggleTheme" @open-settings="openSettings()" @open-account="showAccount = true" />
      <main>
        <div class="dashboard-toolbar">
          <nav class="garden-tabs glass-panel" aria-label="页面导航">
            <a href="#today" :class="{ active: activeSection === 'today' }" @click="activeSection = 'today'"><LayoutGrid :size="14" />今日花园</a>
            <a v-if="prefs.modules.seasonal" href="#seasonal" :class="{ active: activeSection === 'seasonal' }" @click="activeSection = 'seasonal'"><Flower2 :size="14" />四时物候</a>
            <a v-if="prefs.modules.healthTip" href="#wellbeing" :class="{ active: activeSection === 'wellbeing' }" @click="activeSection = 'wellbeing'"><Heart :size="14" />身心日常</a>
          </nav>
          <span class="dashboard-caption"><span class="status-dot"></span>一天一页，慢慢生长</span>
        </div>
        <WeatherTimeline v-if="prefs.modules.weather" :days="weatherDays" :loading="weatherLoading" :city="prefs.selectedCity.name" />

        <!-- 日历卡片 与 纪念日卡片并列区域 -->
        <section
          v-if="(prefs.modules.calendar ?? true) || prefs.modules.upcoming"
          class="calendar-upcoming-row"
          aria-label="月历与纪念日"
        >
          <MonthCalendarCard
            v-if="prefs.modules.calendar ?? true"
            :events="prefs.customEvents"
            :class="{ 'full-width': !prefs.modules.upcoming }"
          />
          <UpcomingTimeline
            v-if="prefs.modules.upcoming"
            :events="upcomingEvents"
            :class="{ 'full-width': !(prefs.modules.calendar ?? true) }"
            @add-event="openSettings('events')"
          />
        </section>

        <!-- 文化日常三列网格：诗词名句、物候花信、生活有方 -->
        <div class="dashboard-grid">
          <DailyPageCard v-if="prefs.modules.dailyPoetry" :poetry="currentPoetry" @next-poetry="handleNextPoetry" @select-poetry="currentPoetry = $event" />
          <SeasonalCard v-if="prefs.modules.seasonal" :bloom="seasonBloom" />
          <EvidenceCard v-if="prefs.modules.evidence" :guide="evidenceGuide" @next-guide="handleNextGuide" />
        </div>
        <HealthTipBar v-if="prefs.modules.healthTip" :tip="currentHealthTip" :date-key="dateKey" @next-tip="handleNextTip" />
        <div v-if="!Object.values(prefs.modules).some(Boolean)" class="glass-panel empty-dashboard"><Sprout :size="32" /><h2>花园留白，随你安排。</h2><button class="soft-button" @click="openSettings()">选择想看的内容</button></div>
      </main>
      <footer class="garden-footer"><span><Sprout :size="13" />Day Garden · 日常花园</span><p>心有闲田，日有花开。</p><button class="text-button" @click="openSettings()">布置我的花园</button></footer>
    </div>
    <SettingsModal v-if="showSettings" :preferences="prefs" :initial-tab="settingsTab" @close="showSettings = false" @update:preferences="handleUpdatePreferences" />
    <AccountModal v-if="showAccount" @close="showAccount = false" />
  </div>
</template>
