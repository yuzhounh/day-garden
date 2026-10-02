<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Plus, Trash2, Download, Upload, Check, Pencil, Clock, Bell, Search } from 'lucide-vue-next'
import type { UserPreferences, LifeEvent } from '../types'
import { requestNotificationPermission, sendDesktopNotification, calculateNextEventDate, sortEventsByDaysLeft, isRedundantMemo, getSafeLunar } from '../services/calendar'
import { cleanEventGiftAdvice } from '../services/storage'
import DetailModal from './DetailModal.vue'

const props = defineProps<{
  preferences: UserPreferences
  initialTab?: 'modules' | 'events' | 'notification'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:preferences', prefs: UserPreferences): void
}>()

const currentTab = ref<'modules' | 'events' | 'notification'>(
  (props.initialTab === 'events' || props.initialTab === 'notification') ? props.initialTab : 'modules'
)

watch(() => props.initialTab, (newTab) => {
  if (newTab === 'events' || newTab === 'notification' || newTab === 'modules') {
    currentTab.value = newTab
  }
})

// 新增事件表单
const newEventTitle = ref('')
const newEventDate = ref('')
const newEventType = ref<'birthday' | 'anniversary' | 'custom'>('birthday')
const newEventRole = ref('')
const newEventAdvice = ref('')
const newEventIsLunar = ref(false)
const notificationStatus = ref<'idle' | 'success' | 'denied'>('idle')

// 编辑事件表单
const editingId = ref<string | null>(null)
const editForm = ref<{
  title: string
  date: string
  role: string
  giftAdvice: string
  isLunar: boolean
}>({
  title: '',
  date: '',
  role: '',
  giftAdvice: '',
  isLunar: false,
})

function startEdit(ev: LifeEvent) {
  editingId.value = ev.id
  editForm.value = {
    title: ev.title,
    date: ev.date,
    role: ev.role || '',
    giftAdvice: ev.giftAdvice || '',
    isLunar: !!ev.isLunar,
  }
}

function cancelEdit() {
  editingId.value = null
}

function saveEdit(id: string) {
  if (!editForm.value.title.trim() || !editForm.value.date.trim()) return

  const updatedEvents = props.preferences.customEvents.map((ev) => {
    if (ev.id !== id) return ev
    return {
      ...ev,
      title: editForm.value.title.trim(),
      date: editForm.value.date.trim(),
      role: editForm.value.role.trim() || undefined,
      giftAdvice: editForm.value.giftAdvice.trim() || undefined,
      isLunar: editForm.value.isLunar,
    }
  })

  emit('update:preferences', {
    ...props.preferences,
    customEvents: sortEventsByDaysLeft(updatedEvents),
  })
  editingId.value = null
}

const searchQuery = ref('')

const sortedEvents = computed(() => {
  const all = sortEventsByDaysLeft(props.preferences?.customEvents || [])
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return all
  return all.filter(ev =>
    ev.title.toLowerCase().includes(q) ||
    (ev.role && ev.role.toLowerCase().includes(q)) ||
    ev.date.includes(q) ||
    (ev.giftAdvice && ev.giftAdvice.toLowerCase().includes(q))
  )
})

function getEventCountdown(ev: LifeEvent) {
  try {
    return calculateNextEventDate(ev?.date || '', !!ev?.isLunar)
  } catch {
    return {
      daysLeft: -1,
      nextDateStr: ev?.date || '',
      nextDateSolar: ev?.date || '',
      nextDateLunar: undefined,
      turningAge: undefined,
    }
  }
}

function getCountdownText(ev: LifeEvent) {
  try {
    const { daysLeft } = getEventCountdown(ev)
    if (daysLeft === 0) return '今天'
    if (daysLeft === 1) return '明天'
    if (daysLeft > 0 && daysLeft <= 999) return `还有 ${daysLeft} 天`
    if (daysLeft > 999) return '待定'
    return '已过去'
  } catch {
    return '待定'
  }
}

function parseDateParts(dateStr: string) {
  if (!dateStr || typeof dateStr !== 'string') {
    return { year: undefined, month: 0, day: 0 }
  }
  const cleanStr = dateStr.trim().replace(/[/. 年月]/g, '-').replace(/日$/, '')
  const parts = cleanStr.split('-').filter(Boolean)
  let year: number | undefined
  let month = 0
  let day = 0
  if (parts.length === 2) {
    month = parseInt(parts[0], 10)
    day = parseInt(parts[1], 10)
  } else if (parts.length >= 3) {
    const y = parseInt(parts[0], 10)
    if (!Number.isNaN(y) && y > 1900 && y < 2200) year = y
    month = parseInt(parts[1], 10)
    day = parseInt(parts[2], 10)
  }
  return { year, month, day }
}

function getBirthDateDisplay(ev: LifeEvent): string {
  try {
    const { year, month, day } = parseDateParts(ev?.date || '')
    if (!month || !day) return ev?.date || ''

    if (ev.isLunar) {
      const lunar = getSafeLunar(year || 2000, month, day)
      const lunarMonthChinese = lunar.getMonthInChinese()
      const lunarDayChinese = lunar.getDayInChinese()
      const yearPrefix = year ? `${year} 年` : ''
      return `${yearPrefix}${lunarMonthChinese}月${lunarDayChinese}（农历）`
    } else {
      const mStr = String(month).padStart(2, '0')
      const dStr = String(day).padStart(2, '0')
      const yearPrefix = year ? `${year} 年 ` : ''
      return `${yearPrefix}${mStr} 月 ${dStr} 日（公历）`
    }
  } catch {
    return ev?.date || ''
  }
}

function getNextDateDisplay(ev: LifeEvent): string {
  try {
    const info = getEventCountdown(ev)
    if (ev.isLunar) {
      return `${info.nextDateSolar}（公历）`
    } else {
      const { year, month, day } = parseDateParts(info.nextDateSolar)
      if (year && month && day) {
        const mStr = String(month).padStart(2, '0')
        const dStr = String(day).padStart(2, '0')
        return `${year} 年 ${mStr} 月 ${dStr} 日（公历）`
      }
      return `${info.nextDateSolar}（公历）`
    }
  } catch {
    return ev?.date || ''
  }
}

function getCountdownClass(ev: LifeEvent) {
  try {
    const { daysLeft } = getEventCountdown(ev)
    if (daysLeft === 0) {
      return 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
    }
    if (daysLeft > 0 && daysLeft <= 7) {
      return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-bold'
    }
    if (daysLeft > 0 && daysLeft <= 30) {
      return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-bold'
    }
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold'
  } catch {
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold'
  }
}

function toggleModule(key: keyof UserPreferences['modules']) {
  const currentVal = props.preferences.modules[key] ?? true
  const updated = {
    ...props.preferences,
    modules: {
      ...props.preferences.modules,
      [key]: !currentVal,
    },
  }
  emit('update:preferences', updated)
}

function addEvent() {
  if (!newEventTitle.value.trim() || !newEventDate.value.trim()) return

  const newEv: LifeEvent = {
    id: 'evt_' + Date.now(),
    title: newEventTitle.value.trim(),
    date: newEventDate.value.trim(),
    type: newEventType.value,
    role: newEventRole.value.trim() || undefined,
    giftAdvice: newEventAdvice.value.trim() || undefined,
    isLunar: newEventIsLunar.value,
  }

  const updated = {
    ...props.preferences,
    customEvents: sortEventsByDaysLeft([...props.preferences.customEvents, newEv]),
  }
  emit('update:preferences', updated)

  newEventTitle.value = ''
  newEventDate.value = ''
  newEventRole.value = ''
  newEventAdvice.value = ''
}

function removeEvent(id: string) {
  const updated = {
    ...props.preferences,
    customEvents: props.preferences.customEvents.filter((e) => e.id !== id),
  }
  emit('update:preferences', updated)
}

async function handleTestNotification() {
  const granted = await requestNotificationPermission()
  if (granted) {
    notificationStatus.value = 'success'
    emit('update:preferences', { ...props.preferences, notificationEnabled: true })
    sendDesktopNotification('Day Garden 生日提前预警', '🎂 妈妈生日还有 12 天 · 建议提前准备礼物')
  } else {
    notificationStatus.value = 'denied'
  }
}

function exportData() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(props.preferences, null, 2))
  const dlAnchorElem = document.createElement('a')
  dlAnchorElem.setAttribute('href', dataStr)
  dlAnchorElem.setAttribute('download', `day-garden-backup-${new Date().toISOString().slice(0, 10)}.json`)
  dlAnchorElem.click()
}

function importData(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  const reader = new FileReader()
  reader.onload = (evt) => {
    try {
      const content = evt.target?.result as string
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed.customEvents)) {
        parsed.customEvents = sortEventsByDaysLeft(parsed.customEvents.map(cleanEventGiftAdvice))
      }
      emit('update:preferences', parsed)
      alert('配置与生活记事导入成功！')
    } catch {
      alert('导入失败，文件格式有误。')
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <DetailModal title="布置你的今日花园" subtitle="PERSONALIZE YOUR GARDEN" class="settings-content" @close="emit('close')">

      <!-- Tab Nav -->
      <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
        <div class="flex">
          <button
            @click="currentTab = 'modules'"
            class="py-3 px-3 text-xs font-medium border-b-2 transition"
            :class="currentTab === 'modules' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
          >
            模块开关
          </button>
          <button
            @click="currentTab = 'events'"
            class="py-3 px-3 text-xs font-medium border-b-2 transition"
            :class="currentTab === 'events' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
          >
            生日与纪念日管理
          </button>
          <button
            @click="currentTab = 'notification'"
            class="py-3 px-3 text-xs font-medium border-b-2 transition"
            :class="currentTab === 'notification' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'"
          >
            提醒与数据备份
          </button>
        </div>
        <div class="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 select-none">
          <Check :size="12" class="text-emerald-500" />
          <span>修改实时自动保存</span>
        </div>
      </div>

      <!-- Tab Content Area -->
      <div class="p-6 overflow-y-auto grow space-y-4">
        <!-- 1. 模块开关 -->
        <div v-if="currentTab === 'modules'" class="space-y-3">
          <p class="text-xs text-slate-500 leading-relaxed">
            极简原则：建议首页启用不超过 6 个模块，确保每天 30 秒内扫视完毕，绝不变成让人刷屏的信息流。
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <label
              class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
              @click.prevent="toggleModule('weather')"
            >
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">7天天气时间轴</span>
              <input type="checkbox" :checked="preferences.modules.weather ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
            </label>

            <label
              class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
              @click.prevent="toggleModule('calendar')"
            >
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">月历与休班节气</span>
              <input type="checkbox" :checked="preferences.modules.calendar ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
            </label>

            <label
              class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
              @click.prevent="toggleModule('upcoming')"
            >
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">岁月里程 · 节日与纪念日</span>
              <input type="checkbox" :checked="preferences.modules.upcoming ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
            </label>

            <label
              class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
              @click.prevent="toggleModule('seasonal')"
            >
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">四时物候与花期</span>
              <input type="checkbox" :checked="preferences.modules.seasonal ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
            </label>

            <label
              class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
              @click.prevent="toggleModule('evidence')"
            >
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">循证生活高性价比锦囊</span>
              <input type="checkbox" :checked="preferences.modules.evidence ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
            </label>

            <label
              class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
              @click.prevent="toggleModule('dailyPoetry')"
            >
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">今日一页 · 诗词名句</span>
              <input type="checkbox" :checked="preferences.modules.dailyPoetry ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
            </label>

            <label
              class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
              @click.prevent="toggleModule('inspirationalQuote')"
            >
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">积极励志 · 名人名言</span>
              <input type="checkbox" :checked="preferences.modules.inspirationalQuote ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
            </label>

            <label
              class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
              @click.prevent="toggleModule('chinaAttractions')"
            >
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">中国最值得去的旅游景点</span>
              <input type="checkbox" :checked="preferences.modules.chinaAttractions ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
            </label>

            <label
              class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
              @click.prevent="toggleModule('sportsExercise')"
            >
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">动健身心 · 运动项目指南</span>
              <input type="checkbox" :checked="preferences.modules.sportsExercise ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
            </label>

            <label
              class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
              @click.prevent="toggleModule('quickNotes')"
            >
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">片刻随想 · 所思所想便签</span>
              <input type="checkbox" :checked="preferences.modules.quickNotes ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
            </label>

            <label
              class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
              @click.prevent="toggleModule('healthTip')"
            >
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">底部健康微提醒</span>
              <input type="checkbox" :checked="preferences.modules.healthTip ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
            </label>
          </div>
        </div>

        <!-- 2. 生日与纪念日管理 -->
        <div v-if="currentTab === 'events'" class="space-y-4">
          <!-- Add Event Form -->
          <div class="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">添加新日子 / 备礼提醒</div>
            <div class="grid grid-cols-2 gap-2.5">
              <input
                v-model="newEventTitle"
                type="text"
                placeholder="事件名 (如: 妈妈生日)"
                class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
              />
              <input
                v-model="newEventDate"
                type="text"
                placeholder="日期 MM-DD (如: 10-08)"
                class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
              />
            </div>
            <div class="grid grid-cols-2 gap-2.5">
              <input
                v-model="newEventRole"
                type="text"
                placeholder="角色备注 (如: 母亲 / 伴侣)"
                class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
              />
              <input
                v-model="newEventAdvice"
                type="text"
                placeholder="备礼备忘 (如: 提前订花)"
                class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
              />
            </div>
            <div class="flex items-center justify-between pt-1">
              <label class="flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 cursor-pointer">
                <input type="checkbox" v-model="newEventIsLunar" class="rounded text-emerald-600" />
                <span>农历日期</span>
              </label>
              <button
                @click="addEvent"
                class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus class="w-4 h-4" />
                <span>确认添加</span>
              </button>
            </div>
          </div>

          <!-- 搜索与筛选栏 -->
          <div class="modal-search-row">
            <div class="search-input-box">
              <Search :size="14" class="text-slate-400" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜索纪念日姓名、角色或日期..."
                class="attraction-search-input"
              />
            </div>
          </div>

          <div v-if="!sortedEvents.length" class="p-8 text-center text-sm text-slate-400">
            未找到匹配的纪念日或生日
          </div>

          <!-- Existing List in 2-Column Responsive Grid -->
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <template v-for="ev in sortedEvents" :key="ev.id">
              <!-- Inline Edit Form (spans 2 columns if in grid) -->
              <div
                v-if="editingId === ev.id"
                class="sm:col-span-2 p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-700/60 space-y-3 text-xs sm:text-sm transition"
              >
                <div class="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <span class="flex items-center gap-1.5">
                    <Pencil class="w-4 h-4" />
                    <span>编辑纪念日</span>
                  </span>
                  <span class="text-slate-400 font-mono text-[11px]">{{ ev.id }}</span>
                </div>
                <div class="grid grid-cols-2 gap-2.5">
                  <input
                    v-model="editForm.title"
                    type="text"
                    placeholder="事件名 (如: 妈妈生日)"
                    class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    v-model="editForm.date"
                    type="text"
                    placeholder="YYYY-MM-DD 或 MM-DD"
                    class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div class="grid grid-cols-2 gap-2.5">
                  <input
                    v-model="editForm.role"
                    type="text"
                    placeholder="角色备注 (如: 侄女 / 伴侣)"
                    class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    v-model="editForm.giftAdvice"
                    type="text"
                    placeholder="备忘/备礼建议 (如: 订蛋糕)"
                    class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div class="flex items-center justify-between pt-1">
                  <label class="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" v-model="editForm.isLunar" class="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span>农历日期</span>
                  </label>
                  <div class="flex items-center gap-2">
                    <button
                      @click="cancelEdit"
                      class="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs sm:text-sm transition"
                    >
                      取消
                    </button>
                    <button
                      @click="saveEdit(ev.id)"
                      class="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Check class="w-4 h-4" />
                      <span>保存</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Normal Display Card (Clean 4-Core Info Card) -->
              <div
                v-else
                class="group relative flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 shadow-xs hover:shadow-md transition-all duration-200"
              >
                <!-- 顶部：姓名 + 角色标签，右侧为悬停操作按钮 -->
                <div class="flex items-center justify-between gap-2 mb-2.5">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="font-bold text-slate-800 dark:text-slate-100 text-[15px] sm:text-base tracking-tight truncate">
                      {{ ev.title }}
                    </span>
                    <span
                      v-if="ev.role"
                      class="px-2 py-0.5 text-xs rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium shrink-0"
                    >
                      {{ ev.role }}
                    </span>
                  </div>

                  <!-- 悬停操作按钮 (编辑 + 删除) -->
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      @click="startEdit(ev)"
                      title="编辑此生日"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>
                    <button
                      @click="removeEvent(ev.id)"
                      title="删除此生日"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <!-- 突出倒数高亮条：天数突出 + 下次周岁 -->
                <div
                  class="flex items-center justify-between px-3.5 py-2 rounded-xl mb-3"
                  :class="getCountdownClass(ev)"
                >
                  <div class="flex items-center gap-1.5 font-bold text-[15px] sm:text-base tracking-wide">
                    <Clock :size="16" />
                    <span>{{ getCountdownText(ev) }}</span>
                  </div>
                  <div v-if="getEventCountdown(ev).turningAge" class="text-sm font-bold">
                    {{ ev.type === 'anniversary' ? `${getEventCountdown(ev).turningAge} 周年` : `满 ${getEventCountdown(ev).turningAge} 周岁` }}
                  </div>
                </div>

                <!-- 核心详情信息：出生日期 & 下次过生日日期 -->
                <div class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400 dark:text-slate-500 text-xs">
                      {{ ev.type === 'anniversary' ? '纪念起始' : '出生日期' }}
                    </span>
                    <span class="font-medium text-slate-700 dark:text-slate-200 text-sm">
                      {{ getBirthDateDisplay(ev) }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between">
                    <span class="text-slate-400 dark:text-slate-500 text-xs">
                      {{ ev.type === 'anniversary' ? '下次纪念日' : '下次生日' }}
                    </span>
                    <span class="font-medium text-slate-800 dark:text-slate-100 text-sm">
                      {{ getNextDateDisplay(ev) }}
                    </span>
                  </div>

                  <!-- 真实备忘/备礼提示（仅当非自动重复生成的文案时展示） -->
                  <div
                    v-if="ev.giftAdvice && !isRedundantMemo(ev.giftAdvice)"
                    class="flex items-center justify-between pt-1.5 text-xs text-amber-600 dark:text-amber-400 border-t border-dashed border-slate-100 dark:border-slate-800"
                  >
                    <span class="text-slate-400 dark:text-slate-500">备忘</span>
                    <span class="truncate font-normal">{{ ev.giftAdvice }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 3. 提醒与数据备份 -->
        <div v-if="currentTab === 'notification'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 grid grid-rows-[auto_1fr_auto] gap-3">
            <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">桌面与 PWA 系统级提醒</div>
            <div class="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              当命中 14天前/3天前/当天 阈值时触发系统弹窗通知。
            </div>
            <div class="flex items-center gap-2.5 pt-1 flex-wrap">
              <button
                @click="handleTestNotification"
                class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition shadow-xs"
              >
                <Bell class="w-3.5 h-3.5" />
                <span>授权并测试推送</span>
              </button>
              <span v-if="notificationStatus === 'success'" class="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check class="w-3.5 h-3.5" /> 测试通知已发送
              </span>
              <span v-else-if="notificationStatus === 'denied'" class="text-xs text-rose-500">
                权限已被禁止，请在地址栏开启
              </span>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 grid grid-rows-[auto_1fr_auto] gap-3">
            <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">数据备份与迁移</div>
            <div class="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              将所有自定义生日、偏好导出为 JSON 文件，随时导入到手机或其他电脑。
            </div>
            <div class="flex items-center gap-3 pt-1">
              <button
                @click="exportData"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition"
              >
                <Download class="w-3.5 h-3.5 text-slate-400" />
                <span>导出备份 JSON</span>
              </button>

              <label class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer transition">
                <Upload class="w-3.5 h-3.5 text-slate-400" />
                <span>导入备份</span>
                <input type="file" accept=".json" @change="importData" class="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>
  </DetailModal>
</template>
