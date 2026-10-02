<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { Sprout, GripVertical } from 'lucide-vue-next'
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
import QuickNoteCard from './components/QuickNoteCard.vue'
import HealthTipBar from './components/HealthTipBar.vue'
import SettingsModal from './components/SettingsModal.vue'
import AccountModal from './components/AccountModal.vue'
import { initializeSync, refreshCloud, account, syncCustomEvents } from './services/sync'
import type { UserPreferences, WeatherDay, CityOption, CuratedPoetry, HealthTip, EvidenceGuide, LifeEvent, InspirationalQuote, AttractionStatusType, SportExercise, SeasonBloom } from './types'
import { fetch7DayWeather } from './services/weather'
import { getUpcomingEvents, sendDesktopNotification } from './services/calendar'
import { loadUserPreferences, saveUserPreferences, DEFAULT_CARD_ORDER, getNormalizedCardOrder, getTodaySeasonBloom, getTodayEvidenceGuide, getTodayPoetry, getTodayHealthTip, getTodayQuote, getTodaySportExercise } from './services/storage'
import { localDateKey } from './services/day'
import rawPoetry from './data/poetry-curated.json'
import rawHealthTips from './data/health-tips.json'
import rawEvidence from './data/evidence-guide.json'
import rawQuotes from './data/inspirational-quotes.json'
import rawSports from './data/sports-exercise.json'
import rawSeasons from './data/seasons-bloom.json'

const prefs = ref<UserPreferences>(loadUserPreferences(account.user?.id))

watch(() => account.user?.id, (userId) => {
  prefs.value = loadUserPreferences(userId)
})

const weatherDays = ref<WeatherDay[]>([])
const weatherLoading = ref(false)
const showSettings = ref(false)
const showAccount = ref(false)
const settingsTab = ref<'modules' | 'notification'>('modules')
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
function pickRandomItem<T>(list: T[], isDifferentFrom?: (item: T) => boolean): T {
  if (!list || list.length === 0) throw new Error('List is empty')
  if (list.length === 1) return list[0]!
  const pool = isDifferentFrom ? list.filter(isDifferentFrom) : list
  const candidates = pool.length > 0 ? pool : list
  const idx = Math.floor(Math.random() * candidates.length)
  return candidates[idx]!
}

function handleNextPoetry() {
  const list = rawPoetry as CuratedPoetry[]
  currentPoetry.value = pickRandomItem(list, p => p.id !== currentPoetry.value.id)
}
function handleNextTip() {
  const list = rawHealthTips as HealthTip[]
  currentHealthTip.value = pickRandomItem(list, t => t.id !== currentHealthTip.value.id)
}
function handleNextGuide() {
  const list = rawEvidence as EvidenceGuide[]
  evidenceGuide.value = pickRandomItem(list, g => g.id !== evidenceGuide.value.id)
}
function handleNextQuote() {
  const list = rawQuotes as InspirationalQuote[]
  currentQuote.value = pickRandomItem(list, q => q.id !== currentQuote.value.id)
}
function handleNextSport() {
  const list = rawSports as SportExercise[]
  currentSport.value = pickRandomItem(list, s => s.id !== currentSport.value.id)
}
function handleNextBloom() {
  const list = rawSeasons as SeasonBloom[]
  seasonBloom.value = pickRandomItem(list, b => b.name !== seasonBloom.value.name)
}
function handleUpdateAttractionStatus(newMap: Record<string, AttractionStatusType>) {
  prefs.value = {
    ...prefs.value,
    attractionStatus: newMap,
  }
  saveUserPreferences(prefs.value, account.user?.id)
}

function handleUpdateCustomEvents(events: LifeEvent[]) {
  prefs.value = {
    ...prefs.value,
    customEvents: events,
  }
  saveUserPreferences(prefs.value, account.user?.id)
}

const isSortMode = ref(false)
const draggingCard = ref<string | null>(null)
const dropTargetCard = ref<string | null>(null)

const effectiveCardOrder = computed(() => getNormalizedCardOrder(prefs.value.cardOrder))
const visibleCards = computed(() =>
  effectiveCardOrder.value.filter(id => prefs.value.modules[id as keyof UserPreferences['modules']] ?? true)
)

function onDragStart(event: DragEvent, cardId: string) {
  if (!isSortMode.value) return
  draggingCard.value = cardId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', cardId)
  }
}

function onDragOver(event: DragEvent, cardId: string) {
  if (!isSortMode.value) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  if (draggingCard.value && draggingCard.value !== cardId) {
    dropTargetCard.value = cardId
  }
}

function onDragLeave(event: DragEvent, cardId: string) {
  if (!isSortMode.value) return
  const related = event.relatedTarget as HTMLElement | null
  const currentTarget = event.currentTarget as HTMLElement | null
  if (!currentTarget || !related || !currentTarget.contains(related)) {
    if (dropTargetCard.value === cardId) {
      dropTargetCard.value = null
    }
  }
}

function reorderCards(source: string, target: string) {
  if (source === target) return
  const current = getNormalizedCardOrder(prefs.value.cardOrder)
  const next = current.filter(id => id !== source)
  const targetIndex = next.indexOf(target)
  if (targetIndex === -1) return
  next.splice(targetIndex, 0, source)
  prefs.value = {
    ...prefs.value,
    cardOrder: next,
  }
  saveUserPreferences(prefs.value, account.user?.id)
}

function onDrop(event: DragEvent, cardId: string) {
  if (!isSortMode.value) return
  event.preventDefault()
  const source = draggingCard.value
  if (source && source !== cardId) {
    reorderCards(source, cardId)
  }
  draggingCard.value = null
  dropTargetCard.value = null
}

function onDragEnd() {
  draggingCard.value = null
  dropTargetCard.value = null
}

function resetCardOrder() {
  prefs.value = {
    ...prefs.value,
    cardOrder: [...DEFAULT_CARD_ORDER],
  }
  saveUserPreferences(prefs.value, account.user?.id)
}

function openSettings(tab?: 'modules' | 'notification' | unknown) {
  if (tab === 'notification' || tab === 'modules') {
    settingsTab.value = tab
  } else {
    settingsTab.value = 'modules'
  }
  showSettings.value = true
}
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
    <div class="ambient-background" aria-hidden="true"><span class="ambient-sage"></span><span class="ambient-peach"></span><span class="ambient-lavender"></span><span class="ambient-sky"></span></div>
    <div class="garden-shell">
      <HeaderHero
        :selected-city="prefs.selectedCity"
        :theme="prefs.theme"
        :sort-mode="isSortMode"
        @update:city="handleCityChange"
        @toggle-theme="toggleTheme"
        @toggle-sort-mode="isSortMode = !isSortMode"
        @open-settings="openSettings()"
        @open-account="showAccount = true"
      />
      <main>
        <WeatherTimeline v-if="prefs.modules.weather" :days="weatherDays" :loading="weatherLoading" :city="prefs.selectedCity.name" />

        <!-- 排序模式提示栏 -->
        <div v-if="isSortMode" class="sort-mode-banner glass-panel" role="status">
          <div class="sort-banner-content">
            <GripVertical :size="16" class="text-emerald-600 dark:text-emerald-400" />
            <span>排序模式已开启：按住任意卡片拖拽即可调整位置</span>
          </div>
          <div class="sort-banner-actions">
            <button class="sort-banner-btn sort-reset-btn" type="button" @click="resetCardOrder">恢复默认排序</button>
            <button class="sort-banner-btn sort-done-btn" type="button" @click="isSortMode = false">完成排序</button>
          </div>
        </div>

        <!-- 中间卡片网格：除最顶部天气与最底部好好照顾自己外，其余卡片均占页面宽度的一半（两列排布） -->
        <section class="two-column-cards-grid" :class="{ 'in-sort-mode': isSortMode }" aria-label="核心生活卡片">
          <div
            v-for="cardId in visibleCards"
            :key="cardId"
            class="dashboard-card-wrapper"
            :class="{
              'is-sort-mode': isSortMode,
              'is-dragging': isSortMode && draggingCard === cardId,
              'is-drop-target': isSortMode && dropTargetCard === cardId,
            }"
            :draggable="isSortMode"
            @dragstart="onDragStart($event, cardId)"
            @dragover="onDragOver($event, cardId)"
            @dragleave="onDragLeave($event, cardId)"
            @drop="onDrop($event, cardId)"
            @dragend="onDragEnd"
          >
            <MonthCalendarCard
              v-if="cardId === 'calendar'"
              :events="prefs.customEvents"
            />
            <UpcomingTimeline
              v-else-if="cardId === 'upcoming'"
              :events="upcomingEvents"
              :custom-events="prefs.customEvents"
              @update:custom-events="handleUpdateCustomEvents"
            />
            <DailyPageCard
              v-else-if="cardId === 'dailyPoetry'"
              :poetry="currentPoetry"
              @next-poetry="handleNextPoetry"
              @select-poetry="currentPoetry = $event"
            />
            <InspirationalQuoteCard
              v-else-if="cardId === 'inspirationalQuote'"
              :quote="currentQuote"
              @next-quote="handleNextQuote"
              @select-quote="currentQuote = $event"
            />
            <QuickNoteCard
              v-else-if="cardId === 'quickNotes'"
            />
            <SeasonalCard
              v-else-if="cardId === 'seasonal'"
              :bloom="seasonBloom"
              @next-bloom="handleNextBloom"
              @select-bloom="seasonBloom = $event"
            />
            <EvidenceCard
              v-else-if="cardId === 'evidence'"
              :guide="evidenceGuide"
              @next-guide="handleNextGuide"
              @select-guide="evidenceGuide = $event"
            />
            <ChinaAttractionsCard
              v-else-if="cardId === 'chinaAttractions'"
              :status-map="prefs.attractionStatus"
              @update:status-map="handleUpdateAttractionStatus"
            />
            <SportsExerciseCard
              v-else-if="cardId === 'sportsExercise'"
              :sport="currentSport"
              @next-sport="handleNextSport"
              @select-sport="currentSport = $event"
            />
          </div>
        </section>

        <!-- 最下面：好好照顾自己卡片（全宽） -->
        <HealthTipBar
          v-if="prefs.modules.healthTip"
          :tip="currentHealthTip"
          :date-key="dateKey"
          @next-tip="handleNextTip"
          @select-tip="currentHealthTip = $event"
        />
        <div v-if="!Object.values(prefs.modules).some(Boolean)" class="glass-panel empty-dashboard"><Sprout :size="32" /><h2>花园留白，随你安排。</h2><button class="soft-button" @click="openSettings()">选择想看的内容</button></div>
      </main>
      <footer class="garden-footer"><span><Sprout :size="13" />Day Garden · 今日花园</span><p>心有闲田，日有花开。</p><button class="text-button" @click="openSettings('modules')">布置我的花园</button></footer>
    </div>
    <SettingsModal v-if="showSettings" :preferences="prefs" :initial-tab="settingsTab" @close="showSettings = false" @update:preferences="handleUpdatePreferences" />
    <AccountModal v-if="showAccount" @close="showAccount = false" />
  </div>
</template>
