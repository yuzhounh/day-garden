<script setup lang="ts">
import { ref } from 'vue'
import { Plus, Trash2, Download, Upload, Check } from 'lucide-vue-next'
import type { UserPreferences, LifeEvent } from '../types'
import { requestNotificationPermission, sendDesktopNotification } from '../services/calendar'
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
            <div
              v-for="ev in preferences.customEvents"
              :key="ev.id"
              class="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
            >
              <div class="truncate">
                <div class="font-medium text-slate-800 dark:text-slate-200">
                  {{ ev.title }} · {{ ev.date }} {{ ev.isLunar ? '(农历)' : '' }}
                </div>
                <div class="text-[11px] text-slate-400 truncate">
                  {{ ev.giftAdvice || '无备忘' }}
                </div>
              </div>
              <button
                @click="removeEvent(ev.id)"
                class="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0 ml-2"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
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
