<script setup lang="ts">
import { ref, watch } from 'vue'
import { Download, Upload, Check, Bell } from 'lucide-vue-next'
import type { UserPreferences } from '../types'
import { requestNotificationPermission, sendDesktopNotification } from '../services/calendar'
import { importPreferences, DEFAULT_CARD_ORDER } from '../services/storage'
import { localDateKey } from '../services/day'
import DetailModal from './DetailModal.vue'

const props = defineProps<{
  preferences: UserPreferences
  initialTab?: 'modules' | 'notification'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:preferences', prefs: UserPreferences): void
}>()

const currentTab = ref<'modules' | 'notification'>(
  props.initialTab === 'notification' ? 'notification' : 'modules'
)

watch(() => props.initialTab, (newTab) => {
  if (newTab === 'notification' || newTab === 'modules') {
    currentTab.value = newTab
  }
})

const notificationStatus = ref<'idle' | 'success' | 'denied'>('idle')

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

function resetCardOrder() {
  emit('update:preferences', {
    ...props.preferences,
    cardOrder: [...DEFAULT_CARD_ORDER],
  })
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
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ version: 2, preferences: props.preferences }, null, 2))
  const dlAnchorElem = document.createElement('a')
  dlAnchorElem.setAttribute('href', dataStr)
  dlAnchorElem.setAttribute('download', `day-garden-backup-${localDateKey()}.json`)
  dlAnchorElem.click()
}

function importData(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  if (file.size > 1024 * 1024) { alert('备份文件过大，请选择不超过 1 MB 的配置文件。'); target.value = ''; return }
  const reader = new FileReader()
  reader.onload = (evt) => {
    try {
      const content = evt.target?.result as string
      const parsed = importPreferences(JSON.parse(content), props.preferences)
      emit('update:preferences', parsed)
      alert('配置与生活记事导入成功！')
    } catch (error) {
      alert('导入失败：' + (error instanceof Error ? error.message : '文件格式有误。'))
    }
    target.value = ''
  }
  reader.onerror = () => { alert('备份文件读取失败。'); target.value = '' }
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
      <Transition name="tab-fade" mode="out-in">
        <!-- 1. 模块开关 -->
        <div v-if="currentTab === 'modules'" key="modules" class="space-y-3">
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
            @click.prevent="toggleModule('quickNotes')"
          >
            <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">片刻随想 · 所思所想便签</span>
            <input type="checkbox" :checked="preferences.modules.quickNotes ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
          </label>

          <label
            class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
            @click.prevent="toggleModule('upcoming')"
          >
            <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">岁月里程 · 重要日子与日程</span>
            <input type="checkbox" :checked="preferences.modules.upcoming ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
          </label>

          <label
            class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
            @click.prevent="toggleModule('gardenAudio')"
          >
            <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">听见花园 · 放松轻音与白噪音</span>
            <input type="checkbox" :checked="preferences.modules.gardenAudio ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
          </label>

          <label
            class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
            @click.prevent="toggleModule('chinaAttractions')"
          >
            <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">华夏胜景 · 中国旅游景点</span>
            <input type="checkbox" :checked="preferences.modules.chinaAttractions ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
          </label>

          <label
            class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
            @click.prevent="toggleModule('seasonal')"
          >
            <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">四时花信 · 物候与花期</span>
            <input type="checkbox" :checked="preferences.modules.seasonal ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
          </label>

          <label
            class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
            @click.prevent="toggleModule('evidence')"
          >
            <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">生活有方 · 循证生活锦囊</span>
            <input type="checkbox" :checked="preferences.modules.evidence ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
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
            @click.prevent="toggleModule('dailyPoetry')"
          >
            <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">今日诗笺 · 今日一页诗词</span>
            <input type="checkbox" :checked="preferences.modules.dailyPoetry ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
          </label>

          <label
            class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
            @click.prevent="toggleModule('inspirationalQuote')"
          >
            <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">名言语录 · 积极励志语录</span>
            <input type="checkbox" :checked="preferences.modules.inspirationalQuote ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
          </label>

          <label
            class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700/60 transition"
            @click.prevent="toggleModule('healthTip')"
          >
            <span class="text-xs font-medium text-slate-800 dark:text-slate-200 select-none">底部健康微提醒</span>
            <input type="checkbox" :checked="preferences.modules.healthTip ?? true" class="rounded text-emerald-600 focus:ring-emerald-500 pointer-events-none" />
          </label>
        </div>

        <div class="flex items-center justify-between pt-3 px-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
          <span class="text-slate-500">卡片排版顺序</span>
          <button
            type="button"
            class="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
            @click="resetCardOrder"
          >
            恢复默认排序
          </button>
        </div>
      </div>

      <!-- 2. 提醒与数据备份 -->
      <div v-else-if="currentTab === 'notification'" key="notification" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </Transition>
    </div>
  </DetailModal>
</template>

<style scoped>
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.tab-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
