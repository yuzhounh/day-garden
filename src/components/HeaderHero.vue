<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import {
  Sun,
  Moon,
  Settings2,
  MapPin,
  ChevronDown,
  Sprout,
  Check,
  Cloud,
  UserRound,
  Search,
  X,
  Loader2,
  GripVertical,
  Headphones,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Shuffle,
  Volume2,
  VolumeX,
  Timer,
} from 'lucide-vue-next'
import { getTodayCalendarInfo } from '../services/calendar'
import {
  DEFAULT_CITIES,
  getRecentCities,
  saveRecentCity,
  searchCities,
} from '../services/weather'
import type { CityOption } from '../types'
import { account } from '../services/sync'
import {
  audioState,
  currentTrack,
  AUDIO_TRACKS,
  togglePlay,
  playTrack,
  prevTrack,
  nextTrack,
  randomTrack,
  setVolume,
  toggleMute,
  setSleepTimer,
} from '../services/audio'

function formatSleepRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const props = defineProps<{
  selectedCity: CityOption
  theme: 'light' | 'dark' | 'auto'
  sortMode?: boolean
}>()
const emit = defineEmits<{
  'update:city': [city: CityOption]
  'toggle-theme': []
  'open-settings': []
  'open-account': []
  'toggle-sort-mode': []
}>()

const now = ref(new Date())
const calendar = computed(() => getTodayCalendarInfo(now.value))
const time = computed(() => now.value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }))
const greeting = computed(() => {
  const hour = now.value.getHours()
  return hour < 6
    ? '夜深了，给自己一点安静。'
    : hour < 11
    ? '早安，让美好慢慢发生。'
    : hour < 14
    ? '午安，留一点时间给自己。'
    : hour < 18
    ? '下午好，日子正在发光。'
    : '晚上好，把日子过成诗。'
})

const isDark = computed(() => props.theme === 'dark' || (props.theme === 'auto' && systemDark.value))
const systemDark = ref(false)

const showCities = ref(false)
const cityMenu = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const searchQuery = ref('')
const searchResults = ref<CityOption[]>([])
const searchLoading = ref(false)
const recentCities = ref<CityOption[]>(getRecentCities())
let searchTimer: number | undefined
let timer: number | undefined

const showAudioPopover = ref(false)
const showPopoverVolume = ref(false)
const audioMenu = ref<HTMLElement | null>(null)

function toggleAudioPopover() {
  showAudioPopover.value = !showAudioPopover.value
  if (!showAudioPopover.value) {
    showPopoverVolume.value = false
  }
}

function closeAudioPopover(event: MouseEvent) {
  if (!audioMenu.value?.contains(event.target as Node)) {
    showAudioPopover.value = false
    showPopoverVolume.value = false
  }
}

function toggleCities() {
  showCities.value = !showCities.value
  if (showCities.value) {
    recentCities.value = getRecentCities()
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  } else {
    clearSearch()
  }
}

function closeCities(event: MouseEvent) {
  if (!cityMenu.value?.contains(event.target as Node)) {
    showCities.value = false
    clearSearch()
  }
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    showCities.value = false
    showAudioPopover.value = false
    showPopoverVolume.value = false
    clearSearch()
  }
}

function onSearchInput() {
  const q = searchQuery.value.trim()
  if (!q) {
    searchResults.value = []
    searchLoading.value = false
    return
  }
  clearTimeout(searchTimer)
  searchLoading.value = true
  searchTimer = window.setTimeout(async () => {
    try {
      searchResults.value = await searchCities(q)
    } finally {
      searchLoading.value = false
    }
  }, 200)
}

function onSearchEnter() {
  if (searchResults.value.length > 0) {
    selectCity(searchResults.value[0]!)
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  searchLoading.value = false
}

function selectCity(city: CityOption) {
  saveRecentCity(city)
  recentCities.value = getRecentCities()
  emit('update:city', city)
  showCities.value = false
  clearSearch()
}

function updateSystem(event: MediaQueryListEvent) {
  systemDark.value = event.matches
}

onMounted(() => {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = query.matches
  query.addEventListener('change', updateSystem)
  timer = window.setInterval(() => { now.value = new Date() }, 30000)
  document.addEventListener('click', closeCities)
  document.addEventListener('click', closeAudioPopover)
  document.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  clearInterval(timer)
  clearTimeout(searchTimer)
  window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', updateSystem)
  document.removeEventListener('click', closeCities)
  document.removeEventListener('click', closeAudioPopover)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <header class="garden-header">
    <div class="topbar">
      <a class="brand" href="#today" aria-label="Day Garden 首页">
        <span class="brand-symbol"><Sprout :size="23" :stroke-width="1.5" /></span>
        <span>Day Garden<small>今 日 花 园</small></span>
      </a>

      <div class="header-actions">
        <!-- 城市选择及搜索入口 -->
        <div ref="cityMenu" class="city-control">
          <button
            class="toolbar-button"
            :aria-expanded="showCities"
            aria-controls="city-options"
            aria-label="选择或搜索城市"
            @click="toggleCities"
          >
            <MapPin :size="14" />
            <span>{{ selectedCity.name }}</span>
            <ChevronDown :size="12" />
          </button>

          <!-- 城市搜索与快捷选择面板 -->
          <div v-if="showCities" id="city-options" class="city-menu glass-panel" @click.stop>
            <div class="city-search-box">
              <Search :size="14" class="search-icon" />
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                placeholder="搜索任意城市（如：苏州、三亚、青岛…）"
                class="city-search-input"
                @input="onSearchInput"
                @keydown.enter="onSearchEnter"
              />
              <button
                v-if="searchQuery"
                class="clear-search-btn"
                type="button"
                aria-label="清空输入"
                @click="clearSearch"
              >
                <X :size="13" />
              </button>
            </div>

            <!-- 搜索结果模式 -->
            <div v-if="searchQuery.trim()" class="city-scroll-body">
              <div v-if="searchLoading" class="city-loading-hint">
                <Loader2 :size="14" class="animate-spin" />
                <span>正在寻找城市定位…</span>
              </div>
              <template v-else-if="searchResults.length">
                <p class="city-section-title">搜索结果 ({{ searchResults.length }})</p>
                <div class="city-result-list">
                  <button
                    v-for="city in searchResults"
                    :key="city.name + '_' + city.lat"
                    type="button"
                    :aria-pressed="city.name === selectedCity.name"
                    class="city-result-item"
                    @click="selectCity(city)"
                  >
                    <span>
                      <strong>{{ city.name }}</strong>
                      <small>{{ city.province }}</small>
                    </span>
                    <Check v-if="city.name === selectedCity.name" :size="14" />
                  </button>
                </div>
              </template>
              <div v-else class="city-empty-hint">
                未找到匹配城市。可尝试输入汉字、地名或拼音。
              </div>
            </div>

            <!-- 默认分类模式（最近使用 + 常用热门城市） -->
            <div v-else class="city-scroll-body">
              <div v-if="recentCities.length" class="city-section">
                <p class="city-section-title">最近使用</p>
                <div class="city-pills-wrap">
                  <button
                    v-for="city in recentCities"
                    :key="'rec-' + city.name"
                    type="button"
                    class="city-pill-btn"
                    :class="{ active: city.name === selectedCity.name }"
                    @click="selectCity(city)"
                  >
                    {{ city.name }}
                  </button>
                </div>
              </div>

              <div class="city-section">
                <p class="city-section-title">常用热门城市</p>
                <div class="city-pills-wrap">
                  <button
                    v-for="city in DEFAULT_CITIES"
                    :key="city.name"
                    type="button"
                    class="city-pill-btn"
                    :class="{ active: city.name === selectedCity.name }"
                    @click="selectCity(city)"
                  >
                    {{ city.name }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <span class="toolbar-divider"></span>

        <!-- 1. 音乐：听见花园 · 放松轻音与白噪音入口 (Scheme A) -->
        <div ref="audioMenu" class="header-audio-control">
          <button
            class="icon-button header-audio-btn"
            :class="{ 'is-playing': audioState.isPlaying, 'is-active': showAudioPopover }"
            :aria-label="audioState.isPlaying ? '正在播放：' + currentTrack.name : '听见花园 · 放松轻音'"
            :title="audioState.isPlaying ? '正在播放：' + currentTrack.name : '听见花园 · 放松轻音'"
            @click="toggleAudioPopover"
          >
            <div v-if="audioState.isPlaying" class="header-audio-waves" aria-hidden="true">
              <span class="bar bar-1"></span>
              <span class="bar bar-2"></span>
              <span class="bar bar-3"></span>
            </div>
            <Headphones v-else :size="17" />
          </button>

          <!-- 导航栏悬浮迷你播放器 -->
          <div v-if="showAudioPopover" class="header-audio-popover glass-panel" @click.stop>
            <div class="popover-track-info">
              <div class="popover-track-badge">
                <span class="popover-badge-dot" :class="{ 'is-active': audioState.isPlaying }"></span>
                <span>{{ currentTrack.category === 'nature' ? '自然声景' : '精选电台' }}</span>
              </div>
              <h4 class="popover-track-title">{{ currentTrack.name }}</h4>
              <p class="popover-track-desc">{{ currentTrack.subtitle }}</p>
            </div>

            <!-- 控制按钮：随机在左、三键居中、音量在右（点击弹出音量条） -->
            <div class="popover-controls-row">
              <!-- 左：随机切换 -->
              <div class="popover-ctrls-left">
                <button class="popover-ctrl-btn" title="随机切换" aria-label="随机切换" @click="randomTrack">
                  <Shuffle :size="14" />
                </button>
              </div>

              <!-- 中：后退、播放、前进居中 -->
              <div class="popover-ctrls-center">
                <button class="popover-ctrl-btn" title="上一曲" aria-label="上一曲" @click="prevTrack">
                  <SkipBack :size="15" />
                </button>
                <button
                  class="popover-play-btn"
                  :title="audioState.isPlaying ? '暂停' : '播放'"
                  :aria-label="audioState.isPlaying ? '暂停' : '播放'"
                  @click="togglePlay"
                >
                  <Pause v-if="audioState.isPlaying" :size="16" />
                  <Play v-else :size="16" />
                </button>
                <button class="popover-ctrl-btn" title="下一曲" aria-label="下一曲" @click="nextTrack">
                  <SkipForward :size="15" />
                </button>
              </div>

              <!-- 右：音量键与弹出滑块 -->
              <div class="popover-ctrls-right popover-volume-wrapper">
                <button
                  class="popover-ctrl-btn vol-toggle-btn"
                  :class="{ 'is-active': showPopoverVolume }"
                  :title="showPopoverVolume ? '收起音量' : '调节音量'"
                  @click.stop="showPopoverVolume = !showPopoverVolume"
                >
                  <VolumeX v-if="audioState.isMuted || audioState.volume === 0" :size="15" />
                  <Volume2 v-else :size="15" />
                </button>

                <!-- 点击音量键后弹出的滑块浮层 -->
                <Transition name="fade-slide">
                  <div v-if="showPopoverVolume" class="popover-volume-pop glass-panel" @click.stop>
                    <button
                      class="popover-mute-mini-btn"
                      :title="audioState.isMuted ? '取消静音' : '静音'"
                      @click="toggleMute"
                    >
                      <VolumeX v-if="audioState.isMuted || audioState.volume === 0" :size="13" />
                      <Volume2 v-else :size="13" />
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      :value="audioState.isMuted ? 0 : audioState.volume"
                      class="popover-volume-slider"
                      aria-label="音量调节"
                      @input="setVolume(Number(($event.target as HTMLInputElement).value))"
                    />
                    <span class="popover-vol-num">{{ audioState.isMuted ? '0%' : audioState.volume + '%' }}</span>
                  </div>
                </Transition>
              </div>
            </div>

            <!-- 曲目选择器 -->
            <div class="popover-track-list">
              <button
                v-for="track in AUDIO_TRACKS"
                :key="track.id"
                class="popover-track-chip"
                :class="{ active: audioState.currentTrackId === track.id }"
                @click="playTrack(track.id)"
              >
                <span class="chip-name">{{ track.name }}</span>
                <span v-if="audioState.currentTrackId === track.id && audioState.isPlaying" class="chip-pulse"></span>
              </button>
            </div>

            <!-- 定时关闭 -->
            <div class="popover-timer-row">
              <span class="popover-timer-label">
                <Timer :size="12" />
                <span v-if="audioState.sleepTimerRemaining > 0">{{ formatSleepRemaining(audioState.sleepTimerRemaining) }} 后静止</span>
                <span v-else>定时关闭</span>
              </span>
              <div class="popover-timer-pills">
                <button
                  v-for="m in [0, 15, 30, 60]"
                  :key="m"
                  class="popover-timer-pill"
                  :class="{ active: audioState.sleepTimerMinutes === m }"
                  @click="setSleepTimer(m)"
                >
                  {{ m === 0 ? '关' : m + '分' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 深色模式：主题切换 -->
        <button
          class="icon-button"
          :aria-label="isDark ? '切换浅色模式' : '切换深色模式'"
          @click="emit('toggle-theme')"
        >
          <Sun v-if="isDark" :size="17" />
          <Moon v-else :size="17" />
        </button>

        <!-- 3. 同步：账户同步按钮 -->
        <button
          class="icon-button account-button"
          :aria-label="account.user ? (account.status === 'synced' ? '云端已同步' : account.status === 'syncing' ? '同步中' : '本机已保存') : '我的花园 · 账户与云端同步'"
          :title="account.user ? (account.status === 'synced' ? '云端已同步' : account.status === 'syncing' ? '同步中' : '本机已保存') : '我的花园 · 账户与云端同步'"
          @click="emit('open-account')"
        >
          <Loader2 v-if="account.status === 'syncing'" :size="17" class="animate-spin text-emerald-600 dark:text-emerald-400" />
          <Cloud v-else-if="account.user" :size="17" />
          <UserRound v-else :size="17" />
        </button>

        <!-- 4. 排序：开启/退出卡片排序模式 -->
        <button
          class="icon-button sort-mode-toggle"
          :class="{ 'is-active': sortMode }"
          :aria-label="sortMode ? '退出排序模式' : '开启排序模式'"
          :title="sortMode ? '退出排序模式' : '开启排序模式'"
          :aria-pressed="Boolean(sortMode)"
          @click="emit('toggle-sort-mode')"
        >
          <Check v-if="sortMode" :size="17" class="sort-active-check" />
          <GripVertical v-else :size="17" />
        </button>

        <!-- 5. 设置：设置入口 -->
        <button
          class="icon-button"
          aria-label="布置我的花园 · 设置与个性化"
          title="布置我的花园 · 设置"
          @click="emit('open-settings')"
        >
          <Settings2 :size="17" />
        </button>
      </div>
    </div>

    <div class="hero-intro">
      <div class="hero-copy">
        <p class="eyebrow"><span class="status-dot"></span> A LITTLE SPACE FOR EVERYDAY LIFE</p>
        <h1>{{ greeting }}</h1>
        <p class="hero-description">感受四时流转，照顾日常，也收藏一点诗意。</p>
      </div>

      <div class="date-card glass-panel" aria-label="今日日期与节气时序">
        <div class="date-card-primary">
          <div class="date-solar-wrap">
            <span class="date-solar">{{ calendar.solarDateStr }}</span>
            <span class="date-time">{{ time }}</span>
          </div>
          <span class="date-weekday">{{ calendar.dayOfWeek }}</span>
        </div>
        <div class="date-card-secondary">
          <span class="lunar-tag">农历</span>
          <span class="lunar-val">{{ calendar.lunarYearStr }} · {{ calendar.lunarMonthStr }}{{ calendar.lunarDayStr }}</span>
        </div>
        <div class="date-card-term">
          <Sprout :size="14" class="term-icon" />
          <span>{{ calendar.termSummary }}</span>
        </div>
      </div>
    </div>
  </header>
</template>
