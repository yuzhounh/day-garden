<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, defineAsyncComponent } from 'vue'
import { Sprout, GripVertical } from 'lucide-vue-next'
import HeaderHero from './components/HeaderHero.vue'
import WeatherTimeline from './components/WeatherTimeline.vue'
import LazyCard from './components/LazyCard.vue'
const MonthCalendarCard = defineAsyncComponent(() => import('./components/MonthCalendarCard.vue'))
const UpcomingTimeline = defineAsyncComponent(() => import('./components/UpcomingTimeline.vue'))
const ChinaAttractionsCard = defineAsyncComponent(() => import('./components/ChinaAttractionsCard.vue'))
const QuickNoteCard = defineAsyncComponent(() => import('./components/QuickNoteCard.vue'))
const GardenAudioCard = defineAsyncComponent(() => import('./components/GardenAudioCard.vue'))
const DailyContentCard = defineAsyncComponent(() => import('./components/DailyContentCard.vue'))
const SettingsModal = defineAsyncComponent(() => import('./components/SettingsModal.vue'))
const AccountModal = defineAsyncComponent(() => import('./components/AccountModal.vue'))
import { initializeSync, refreshCloud, account, syncCustomEvents } from './services/sync'
import type { UserPreferences, WeatherDay, CityOption, LifeEvent, AttractionStatusType } from './types'
import { fetch7DayWeather } from './services/weather'
import { getUpcomingEvents } from './services/calendar'
import { notifyUpcomingEvents } from './services/notifications'
import { loadUserPreferences, saveUserPreferences, DEFAULT_CARD_ORDER, getNormalizedCardOrder } from './services/storage'
import { localDateKey, currentDate, useCurrentTime } from './services/day'
import { storageState } from './services/persistence'

const prefs = ref<UserPreferences>(loadUserPreferences(account.user?.id))
useCurrentTime()

watch(() => account.user?.id, (userId) => {
  prefs.value = loadUserPreferences(userId)
})

const weatherDays = ref<WeatherDay[]>([])
const weatherLoading = ref(false)
const showSettings = ref(false)
const showAccount = ref(false)
const settingsTab = ref<'modules' | 'notification'>('modules')
const dateKey = ref(localDateKey())
const upcomingEvents = computed(() => {
  void dateKey.value
  return getUpcomingEvents(prefs.value.customEvents, 30)
})
function applyTheme(theme: UserPreferences['theme']) {
  document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches))
}
function toggleTheme() {
  prefs.value.theme = document.documentElement.classList.contains('dark') ? 'light' : 'dark'
  saveUserPreferences(prefs.value, account.user?.id)
}
function handleCityChange(city: CityOption) {
  prefs.value.selectedCity = city
  saveUserPreferences(prefs.value, account.user?.id)
}
function handleUpdatePreferences(newPrefs: UserPreferences) {
  const previousEvents = prefs.value.customEvents
  prefs.value = newPrefs
  saveUserPreferences(newPrefs, account.user?.id)
  if (account.user && JSON.stringify(previousEvents) !== JSON.stringify(newPrefs.customEvents)) {
    void syncCustomEvents(newPrefs.customEvents, previousEvents)
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
function handleUpdateAttractionStatus(newMap: Record<string, AttractionStatusType>) {
  prefs.value = {
    ...prefs.value,
    attractionStatus: newMap,
  }
  saveUserPreferences(prefs.value, account.user?.id)
}

function handleUpdateCustomEvents(events: LifeEvent[]) {
  const previousEvents = prefs.value.customEvents
  prefs.value = {
    ...prefs.value,
    customEvents: events,
  }
  saveUserPreferences(prefs.value, account.user?.id)
  if (account.user) void syncCustomEvents(events, previousEvents)
}

const isSortMode = ref(false)
const cardTitles: Record<string, string> = { calendar: '月历', upcoming: '岁月里程', quickNotes: '拾光随笔', gardenAudio: '花园声景', seasonal: '四时花期', dailyPoetry: '经典晨读', inspirationalQuote: '名言语录', evidence: '生活锦囊', chinaAttractions: '山河行记', sportsExercise: '每日运动' }
const sortAnnouncement = ref('')
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

function moveCard(cardId: string, direction: -1 | 1) {
  const index = visibleCards.value.indexOf(cardId)
  const target = visibleCards.value[index + direction]
  if (!target) return
  const order = [...effectiveCardOrder.value]
  const sourceIndex = order.indexOf(cardId)
  const targetIndex = order.indexOf(target)
  order.splice(sourceIndex, 1)
  order.splice(targetIndex, 0, cardId)
  prefs.value = { ...prefs.value, cardOrder: order }
  saveUserPreferences(prefs.value, account.user?.id)
  sortAnnouncement.value = `${cardTitles[cardId]}已移到第 ${index + direction + 1} 位。`
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
  notifyUpcomingEvents(upcomingEvents.value, account.user?.id, dateKey.value)
}
function syncDate() {
  const nextDate = localDateKey()
  if (dateKey.value === nextDate) return
  dateKey.value = nextDate
  if (prefs.value.modules.weather) void loadWeather()
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
watch(() => prefs.value.theme, applyTheme, { immediate: true })
watch(() => [account.user?.id, prefs.value.selectedCity.name, prefs.value.selectedCity.lat, prefs.value.selectedCity.lon, prefs.value.modules.weather], () => {
  if (prefs.value.modules.weather) void loadWeather()
  else { weatherRequest++; weatherDays.value = []; weatherLoading.value = false }
}, { immediate: true })
watch(currentDate, syncDate)
watch(() => [prefs.value.notificationEnabled, account.user?.id, upcomingEvents.value], checkBirthdayAlerts)
onMounted(() => {
  checkBirthdayAlerts()
  void initializeSync()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemTheme)
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('online', handleOnline)
  window.addEventListener('daygarden:prefs-synced', handlePrefsSynced)
})
onUnmounted(() => {
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
        <p v-if="storageState.error" class="glass-panel p-4 mb-4" role="alert">{{ storageState.error }}</p>
        <WeatherTimeline v-if="prefs.modules.weather" :days="weatherDays" :loading="weatherLoading" :city="prefs.selectedCity.name" />

        <!-- 排序模式提示栏 -->
        <div v-if="isSortMode" class="sort-mode-banner glass-panel" role="status">
          <div class="sort-banner-content">
            <GripVertical :size="16" class="text-emerald-600 dark:text-emerald-400" />
            <span>排序模式已开启：拖拽卡片，或使用上移、下移按钮调整位置</span>
          </div>
          <div class="sort-banner-actions">
            <button class="sort-banner-btn sort-reset-btn" type="button" @click="resetCardOrder">恢复默认排序</button>
            <button class="sort-banner-btn sort-done-btn" type="button" @click="isSortMode = false">完成排序</button>
          </div>
        </div>

        <!-- 中间卡片网格：除最顶部天气与最底部好好照顾自己外，其余卡片均占页面宽度的一半（两列排布） -->
        <p class="sr-only" aria-live="polite">{{ sortAnnouncement }}</p>
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
            <div v-if="isSortMode" class="flex gap-2 p-2" role="group" :aria-label="(cardTitles[cardId] || cardId) + '位置调整'">
              <button class="soft-button" type="button" :disabled="visibleCards[0] === cardId" :aria-label="'上移' + cardTitles[cardId]" @click="moveCard(cardId, -1)">上移</button>
              <button class="soft-button" type="button" :disabled="visibleCards[visibleCards.length - 1] === cardId" :aria-label="'下移' + cardTitles[cardId]" @click="moveCard(cardId, 1)">下移</button>
            </div>
            <LazyCard :title="cardTitles[cardId] || cardId">
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
            <GardenAudioCard
              v-else-if="cardId === 'gardenAudio'"
            />
            <DailyContentCard
              v-else-if="cardId === 'dailyPoetry'"
              kind="dailyPoetry"
            />
            <DailyContentCard
              v-else-if="cardId === 'inspirationalQuote'"
              kind="inspirationalQuote"
            />
            <QuickNoteCard
              v-else-if="cardId === 'quickNotes'"
            />
            <DailyContentCard
              v-else-if="cardId === 'seasonal'"
              kind="seasonal"
            />
            <DailyContentCard
              v-else-if="cardId === 'evidence'"
              kind="evidence"
            />
            <ChinaAttractionsCard
              v-else-if="cardId === 'chinaAttractions'"
              :status-map="prefs.attractionStatus"
              @update:status-map="handleUpdateAttractionStatus"
            />
            <DailyContentCard
              v-else-if="cardId === 'sportsExercise'"
              kind="sportsExercise"
            />
            </LazyCard>
          </div>
        </section>

        <!-- 最下面：好好照顾自己卡片（全宽） -->
        <LazyCard v-if="prefs.modules.healthTip" title="好好照顾自己"><DailyContentCard kind="healthTip" /></LazyCard>
        <div v-if="!Object.values(prefs.modules).some(Boolean)" class="glass-panel empty-dashboard"><Sprout :size="32" /><h2>花园留白，随你安排。</h2><button class="soft-button" @click="openSettings()">选择想看的内容</button></div>
      </main>
      <footer class="garden-footer"><span><Sprout :size="13" />Day Garden · 今日花园</span><p>心有闲田，日有花开。</p><button class="text-button" @click="openSettings('modules')">布置我的花园</button></footer>
    </div>
    <SettingsModal v-if="showSettings" :preferences="prefs" :initial-tab="settingsTab" @close="showSettings = false" @update:preferences="handleUpdatePreferences" />
    <AccountModal v-if="showAccount" @close="showAccount = false" />
  </div>
</template>
