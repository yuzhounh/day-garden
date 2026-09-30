<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Trash2, Download, Upload, Check, Pencil } from 'lucide-vue-next'
import type { UserPreferences, LifeEvent } from '../types'
import { requestNotificationPermission, sendDesktopNotification, calculateNextEventDate } from '../services/calendar'
import DetailModal from './DetailModal.vue'

const props = defineProps<{
  preferences: UserPreferences
  initialTab?: 'modules' | 'events' | 'notification'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:preferences', prefs: UserPreferences): void
}>()

const currentTab = ref<'modules' | 'events' | 'notification'>(props.initialTab || 'modules')

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
    customEvents: updatedEvents,
  })
  editingId.value = null
}

function getEventCountdown(ev: LifeEvent) {
  try {
    return calculateNextEventDate(ev.date, !!ev.isLunar)
  } catch {
    return { daysLeft: -1, nextDateStr: '' }
  }
}

function getCountdownText(ev: LifeEvent) {
  const { daysLeft } = getEventCountdown(ev)
  if (daysLeft === 0) return '今天'
  if (daysLeft === 1) return '明天'
  if (daysLeft > 0) return `还有 ${daysLeft} 天`
  return '已过去'
}

function getNextDateText(ev: LifeEvent) {
  const { nextDateStr } = getEventCountdown(ev)
  return nextDateStr
}

function getCountdownClass(ev: LifeEvent) {
  const { daysLeft } = getEventCountdown(ev)
  if (daysLeft === 0) {
    return 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold'
  }
  if (daysLeft <= 7) {
    return 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-semibold'
  }
  if (daysLeft <= 30) {
    return 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-medium'
  }
  return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
}

function toggleModule(key: keyof UserPreferences['modules']) {
  const updated = {
    ...props.preferences,
    modules: {
      ...props.preferences.modules,
      [key]: !props.preferences.modules[key],
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
    customEvents: [...props.preferences.customEvents, newEv],
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
      <div class="flex border-b border-slate-100 dark:border-slate-800 px-6 shrink-0 bg-slate-50/50 dark:bg-slate-800/30">
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

      <!-- Tab Content Area -->
      <div class="p-6 overflow-y-auto grow space-y-4">
        <!-- 1. 模块开关 -->
        <div v-if="currentTab === 'modules'" class="space-y-3">
          <p class="text-xs text-slate-500 leading-relaxed">
            极简原则：建议首页启用不超过 6 个模块，确保每天 30 秒内扫视完毕，绝不变成让人刷屏的信息流。
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200">7天天气时间轴</span>
              <input type="checkbox" :checked="preferences.modules.weather" @change="toggleModule('weather')" class="rounded text-emerald-600 focus:ring-emerald-500" />
            </label>

            <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200">月历与休班节气</span>
              <input type="checkbox" :checked="preferences.modules.calendar ?? true" @change="toggleModule('calendar')" class="rounded text-emerald-600 focus:ring-emerald-500" />
            </label>

            <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200">节日与重要纪念日</span>
              <input type="checkbox" :checked="preferences.modules.upcoming" @change="toggleModule('upcoming')" class="rounded text-emerald-600 focus:ring-emerald-500" />
            </label>

            <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200">四时物候与花期</span>
              <input type="checkbox" :checked="preferences.modules.seasonal" @change="toggleModule('seasonal')" class="rounded text-emerald-600 focus:ring-emerald-500" />
            </label>

            <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200">循证生活高性价比锦囊</span>
              <input type="checkbox" :checked="preferences.modules.evidence" @change="toggleModule('evidence')" class="rounded text-emerald-600 focus:ring-emerald-500" />
            </label>

            <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200">今日一页 · 诗词名句</span>
              <input type="checkbox" :checked="preferences.modules.dailyPoetry" @change="toggleModule('dailyPoetry')" class="rounded text-emerald-600 focus:ring-emerald-500" />
            </label>

            <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200">积极励志 · 名人名言</span>
              <input type="checkbox" :checked="preferences.modules.inspirationalQuote ?? true" @change="toggleModule('inspirationalQuote')" class="rounded text-emerald-600 focus:ring-emerald-500" />
            </label>

            <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200">中国最值得去的旅游景点</span>
              <input type="checkbox" :checked="preferences.modules.chinaAttractions ?? true" @change="toggleModule('chinaAttractions')" class="rounded text-emerald-600 focus:ring-emerald-500" />
            </label>

            <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer">
              <span class="text-xs font-medium text-slate-800 dark:text-slate-200">底部健康微提醒</span>
              <input type="checkbox" :checked="preferences.modules.healthTip" @change="toggleModule('healthTip')" class="rounded text-emerald-600 focus:ring-emerald-500" />
            </label>
          </div>
        </div>

        <!-- 2. 生日与纪念日管理 -->
        <div v-if="currentTab === 'events'" class="space-y-4">
          <!-- Add Event Form -->
          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div class="text-xs font-medium text-slate-700 dark:text-slate-300">添加新日子 / 备礼提醒</div>
            <div class="grid grid-cols-2 gap-2">
              <input
                v-model="newEventTitle"
                type="text"
                placeholder="事件名 (如: 妈妈生日)"
                class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <input
                v-model="newEventDate"
                type="text"
                placeholder="日期 MM-DD (如: 10-08)"
                class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <input
                v-model="newEventRole"
                type="text"
                placeholder="角色备注 (如: 母亲 / 伴侣)"
                class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <input
                v-model="newEventAdvice"
                type="text"
                placeholder="备礼备忘 (如: 提前订花)"
                class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>
            <div class="flex items-center justify-between pt-1">
              <label class="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" v-model="newEventIsLunar" class="rounded text-emerald-600" />
                <span>农历日期</span>
              </label>
              <button
                @click="addEvent"
                class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition flex items-center gap-1"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>确认添加</span>
              </button>
            </div>
          </div>

          <!-- Existing List -->
          <div class="space-y-2">
            <template v-for="ev in preferences.customEvents" :key="ev.id">
              <!-- Inline Edit Form -->
              <div
                v-if="editingId === ev.id"
                class="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-700/60 space-y-2.5 text-xs transition"
              >
                <div class="flex items-center justify-between text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                  <span class="flex items-center gap-1.5">
                    <Pencil class="w-3.5 h-3.5" />
                    <span>编辑纪念日</span>
                  </span>
                  <span class="text-slate-400 font-mono text-[10px]">{{ ev.id }}</span>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <input
                    v-model="editForm.title"
                    type="text"
                    placeholder="事件名 (如: 妈妈生日)"
                    class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    v-model="editForm.date"
                    type="text"
                    placeholder="YYYY-MM-DD 或 MM-DD"
                    class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <input
                    v-model="editForm.role"
                    type="text"
                    placeholder="角色备注 (如: 侄女 / 伴侣)"
                    class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <input
                    v-model="editForm.giftAdvice"
                    type="text"
                    placeholder="备忘/备礼建议 (如: 订蛋糕)"
                    class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div class="flex items-center justify-between pt-1">
                  <label class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" v-model="editForm.isLunar" class="rounded text-emerald-600 focus:ring-emerald-500" />
                    <span>农历日期</span>
                  </label>
                  <div class="flex items-center gap-2">
                    <button
                      @click="cancelEdit"
                      class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs transition"
                    >
                      取消
                    </button>
                    <button
                      @click="saveEdit(ev.id)"
                      class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition flex items-center gap-1 shadow-sm"
                    >
                      <Check class="w-3.5 h-3.5" />
                      <span>保存</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Normal Display Row -->
              <div
                v-else
                class="group flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-xs transition"
              >
                <!-- Title, Role, Date, Advice -->
                <div class="truncate min-w-0 flex-1 mr-3">
                  <div class="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200 truncate">
                    <span class="truncate">{{ ev.title }}</span>
                    <span
                      v-if="ev.role"
                      class="px-1.5 py-0.2 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 font-normal"
                    >
                      {{ ev.role }}
                    </span>
                    <span class="text-slate-400 font-normal shrink-0">· {{ ev.date }} {{ ev.isLunar ? '(农历)' : '(公历)' }}</span>
                  </div>
                  <div class="text-[11px] text-slate-400 truncate mt-0.5">
                    {{ ev.giftAdvice || '无备忘' }}
                  </div>
                </div>

                <!-- Right Side: Countdown and Action Buttons -->
                <div class="flex items-center gap-2 shrink-0">
                  <!-- 到下一个纪念日的天数 -->
                  <div class="text-right shrink-0">
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-[11px]"
                      :class="getCountdownClass(ev)"
                    >
                      {{ getCountdownText(ev) }}
                    </span>
                    <div class="text-[10px] text-slate-400 mt-0.5 text-right font-mono">
                      {{ getNextDateText(ev) }}
                    </div>
                  </div>

                  <!-- 操作按钮组（编辑 + 删除）：默认隐藏，鼠标悬停时显示 -->
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      @click="startEdit(ev)"
                      title="编辑此纪念日"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                    >
                      <Pencil class="w-3.5 h-3.5" />
                    </button>
                    <button
                      @click="removeEvent(ev.id)"
                      title="删除此纪念日"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- 3. 提醒与数据备份 -->
        <div v-if="currentTab === 'notification'" class="space-y-4">
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs font-medium text-slate-800 dark:text-slate-200">桌面与 PWA 系统级提醒</div>
                <div class="text-[11px] text-slate-400 mt-0.5">当命中 14天前/3天前/当天 阈值时触发系统弹窗</div>
              </div>
              <button
                @click="handleTestNotification"
                class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition"
              >
                授权并测试推送
              </button>
            </div>
            <div v-if="notificationStatus === 'success'" class="text-xs text-emerald-600 flex items-center gap-1">
              <Check class="w-3.5 h-3.5" /> 已成功发送桌面测试通知！
            </div>
            <div v-else-if="notificationStatus === 'denied'" class="text-xs text-rose-500">
              通知已被浏览器禁止，请在地址栏权限设置中开启。
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <div class="text-xs font-medium text-slate-800 dark:text-slate-200">数据备份与迁移</div>
            <div class="text-[11px] text-slate-400">将所有自定义生日、偏好导出为 JSON 文件，随时导入到手机或其他电脑。</div>
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

      <!-- Footer -->
      <div class="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
        <button
          @click="emit('close')"
          class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium transition"
        >
          完成
        </button>
      </div>
  </DetailModal>
</template>
