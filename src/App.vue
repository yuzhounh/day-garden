<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { LayoutGrid, Flower2, Heart, Sprout } from 'lucide-vue-next'
import HeaderHero from './components/HeaderHero.vue'
import WeatherTimeline from './components/WeatherTimeline.vue'
import MonthCalendarCard from './components/MonthCalendarCard.vue'
import UpcomingTimeline from './components/UpcomingTimeline.vue'
import SeasonalCard from './components/SeasonalCard.vue'
import EvidenceCard from './components/EvidenceCard.vue'
import DailyPageCard from './components/DailyPageCard.vue'
import InspirationalQuoteCard from './components/InspirationalQuoteCard.vue'
import ChinaAttractionsCard from './components/ChinaAttractionsCard.vue'
import SportsExerciseCard from './components/SportsExerciseCard.vue'
import HealthTipBar from './components/HealthTipBar.vue'
import SettingsModal from './components/SettingsModal.vue'
import AccountModal from './components/AccountModal.vue'
import { initializeSync, refreshCloud, account, syncCustomEvents } from './services/sync'
import type { UserPreferences, WeatherDay, CityOption, CuratedPoetry, HealthTip, EvidenceGuide, LifeEvent, InspirationalQuote, AttractionStatusType, SportExercise } from './types'
import { fetch7DayWeather } from './services/weather'
import { getUpcomingEvents, sendDesktopNotification } from './services/calendar'
import { loadUserPreferences, saveUserPreferences, getTodaySeasonBloom, getTodayEvidenceGuide, getTodayPoetry, getTodayHealthTip, getTodayQuote, getTodaySportExercise } from './services/storage'
import { localDateKey } from './services/day'
import rawPoetry from './data/poetry-curated.json'
import rawHealthTips from './data/health-tips.json'
import rawEvidence from './data/evidence-guide.json'
import rawQuotes from './data/inspirational-quotes.json'
import rawSports from './data/sports-exercise.json'

const prefs = ref<UserPreferences>(loadUserPreferences(account.user?.id))

watch(() => account.user?.id, (userId) => {
  prefs.value = loadUserPreferences(userId)
})

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
const currentQuote = ref<InspirationalQuote>(getTodayQuote())
const currentSport = ref<SportExercise>(getTodaySportExercise())
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
  saveUserPreferences(prefs.value, account.user?.id)
}
function handleCityChange(city: CityOption) {
  prefs.value.selectedCity = city
  saveUserPreferences(prefs.value, account.user?.id)
  loadWeather()
}
function handleUpdatePreferences(newPrefs: UserPreferences) {
  const cityChanged = newPrefs.selectedCity.name !== prefs.value.selectedCity.name
  prefs.value = newPrefs
  saveUserPreferences(newPrefs, account.user?.id)
  applyTheme(newPrefs.theme)
  if (cityChanged) loadWeather()
  if (account.user) {
    void syncCustomEvents(newPrefs.customEvents)
  }
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
function handleNextQuote() {
  const list = rawQuotes as InspirationalQuote[]
  currentQuote.value = list[(list.findIndex(q => q.id === currentQuote.value.id) + 1) % list.length]
}
function handleNextSport() {
  const list = rawSports as SportExercise[]
  currentSport.value = list[(list.findIndex(s => s.id === currentSport.value.id) + 1) % list.length]
}
function handleUpdateAttractionStatus(newMap: Record<string, AttractionStatusType>) {
  prefs.value = {
    ...prefs.value,
    attractionStatus: newMap,
  }
  saveUserPreferences(prefs.value, account.user?.id)
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
  currentQuote.value = getTodayQuote()
  currentSport.value = getTodaySportExercise()
  loadWeather()
  checkBirthdayAlerts()
}
function handleSystemTheme() { if (prefs.value.theme === 'auto') applyTheme('auto') }
function handleVisibility() { syncDate(); if (!document.hidden) void refreshCloud() }
function handleOnline() { void refreshCloud() }
function handlePrefsSynced(e: Event) {
  const custom = e as CustomEvent<{ userId: string; customEvents: LifeEvent[] }>
  if (account.user?.id === custom.detail.userId) {
    prefs.value.customEvents = custom.detail.customEvents
  }
}
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
  window.addEventListener('daygarden:prefs-synced', handlePrefsSynced)
})
onUnmounted(() => {
  clearInterval(dayTimer)
  window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handleSystemTheme)
  document.removeEventListener('visibilitychange', handleVisibility)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('daygarden:prefs-synced', handlePrefsSynced)
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

        <!-- 中间卡片网格：除最顶部天气与最底部好好照顾自己外，其余卡片均占页面宽度的一半（两列排布） -->
        <section class="two-column-cards-grid" aria-label="核心生活卡片">
          <MonthCalendarCard
            v-if="prefs.modules.calendar ?? true"
            :events="prefs.customEvents"
          />
          <UpcomingTimeline
            v-if="prefs.modules.upcoming"
            :events="upcomingEvents"
            @add-event="openSettings('events')"
          />
          <DailyPageCard
            v-if="prefs.modules.dailyPoetry"
            :poetry="currentPoetry"
            @next-poetry="handleNextPoetry"
            @select-poetry="currentPoetry = $event"
          />
          <InspirationalQuoteCard
            v-if="prefs.modules.inspirationalQuote ?? true"
            :quote="currentQuote"
            @next-quote="handleNextQuote"
            @select-quote="currentQuote = $event"
          />
          <SeasonalCard
            v-if="prefs.modules.seasonal"
            :bloom="seasonBloom"
          />
          <EvidenceCard
            v-if="prefs.modules.evidence"
            :guide="evidenceGuide"
            @next-guide="handleNextGuide"
          />
          <ChinaAttractionsCard
            v-if="prefs.modules.chinaAttractions ?? true"
            :status-map="prefs.attractionStatus"
            @update:status-map="handleUpdateAttractionStatus"
          />
          <SportsExerciseCard
            v-if="prefs.modules.sportsExercise ?? true"
            :sport="currentSport"
            @next-sport="handleNextSport"
            @select-sport="currentSport = $event"
          />
        </section>

        <!-- 最下面：好好照顾自己卡片（全宽） -->
        <HealthTipBar v-if="prefs.modules.healthTip" :tip="currentHealthTip" :date-key="dateKey" @next-tip="handleNextTip" />
        <div v-if="!Object.values(prefs.modules).some(Boolean)" class="glass-panel empty-dashboard"><Sprout :size="32" /><h2>花园留白，随你安排。</h2><button class="soft-button" @click="openSettings()">选择想看的内容</button></div>
      </main>
      <footer class="garden-footer"><span><Sprout :size="13" />Day Garden · 今日花园</span><p>心有闲田，日有花开。</p><button class="text-button" @click="openSettings()">布置我的花园</button></footer>
    </div>
    <SettingsModal v-if="showSettings" :preferences="prefs" :initial-tab="settingsTab" @close="showSettings = false" @update:preferences="handleUpdatePreferences" />
    <AccountModal v-if="showAccount" @close="showAccount = false" />
  </div>
</template>
