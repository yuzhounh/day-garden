<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Trash2, Pencil, Clock, Search, Heart, Cake } from 'lucide-vue-next'
import type { LifeEvent } from '../types'
import {
  calculateNextEventDate,
  sortEventsByDaysLeft,
  isRedundantMemo,
  getSafeLunar,
  isAnniversaryEvent,
} from '../services/calendar'
import DetailModal from './DetailModal.vue'
import { validateLifeEvent, validateEventList, parseEventDate } from '../services/validation'

const props = withDefaults(
  defineProps<{
    customEvents: LifeEvent[]
    initialAdd?: boolean
  }>(),
  {
    initialAdd: false,
  }
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:customEvents', events: LifeEvent[]): void
}>()

// 新增事件表单
const showAddForm = ref(props.initialAdd)
const newEventTitle = ref('')
const newEventDate = ref('')
const newEventType = ref<'birthday' | 'anniversary' | 'custom'>('birthday')
const newEventRole = ref('')
const newEventAdvice = ref('')
const newEventIsLunar = ref(false)

function onTitleChange(title: string) {
  if (isAnniversaryEvent({ title })) {
    newEventType.value = 'anniversary'
  } else if (title.includes('生日') || title.includes('生辰')) {
    newEventType.value = 'birthday'
  }
}

// 编辑事件表单
const editingId = ref<string | null>(null)
const editForm = ref<{
  title: string
  date: string
  role: string
  giftAdvice: string
  isLunar: boolean
  type: 'birthday' | 'anniversary' | 'custom'
}>({
  title: '',
  date: '',
  role: '',
  giftAdvice: '',
  isLunar: false,
  type: 'birthday',
})

function startEdit(ev: LifeEvent) {
  showAddForm.value = false
  editingId.value = ev.id
  editForm.value = {
    title: ev.title,
    date: ev.date,
    role: ev.role || '',
    giftAdvice: ev.giftAdvice || '',
    isLunar: !!ev.isLunar,
    type: isAnniversaryEvent(ev) ? 'anniversary' : ((ev.type === 'anniversary' || ev.type === 'custom') ? ev.type : 'birthday'),
  }
}

function cancelEdit() {
  editingId.value = null
}

function saveEdit(id: string) {
  if (!editForm.value.title.trim() || !editForm.value.date.trim()) return
  try { validateLifeEvent({ ...editForm.value, id }) } catch (error) { formError.value = (error as Error).message; return }
  formError.value = ''

  const isAnniv = isAnniversaryEvent({ title: editForm.value.title, type: editForm.value.type })
  const updatedEvents = props.customEvents.map((ev) => {
    if (ev.id !== id) return ev
    return {
      ...ev,
      title: editForm.value.title.trim(),
      date: parseEventDate(editForm.value.date, editForm.value.isLunar)!.date,
      type: isAnniv ? 'anniversary' : editForm.value.type,
      role: editForm.value.role.trim() || undefined,
      giftAdvice: editForm.value.giftAdvice.trim() || undefined,
      isLunar: editForm.value.isLunar,
    }
  })

  emit('update:customEvents', sortEventsByDaysLeft(updatedEvents))
  editingId.value = null
}

const searchQuery = ref('')

const sortedEvents = computed(() => {
  const all = sortEventsByDaysLeft(props.customEvents || [])
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return all
  return all.filter((ev) =>
    ev.title.toLowerCase().includes(q) ||
    (ev.role && ev.role.toLowerCase().includes(q)) ||
    ev.date.includes(q) ||
    (ev.giftAdvice && ev.giftAdvice.toLowerCase().includes(q))
  )
})

function getEventCountdown(ev: LifeEvent) {
  try {
    return calculateNextEventDate(ev?.date || '', !!ev?.isLunar, new Date(), isAnniversaryEvent(ev))
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

function addEvent() {
  if (!newEventTitle.value.trim() || !newEventDate.value.trim()) return

  const isAnniv = isAnniversaryEvent({ title: newEventTitle.value, type: newEventType.value })
  const newEv: LifeEvent = {
    id: 'evt_' + crypto.randomUUID(),
    title: newEventTitle.value.trim(),
    date: newEventDate.value.trim(),
    type: isAnniv ? 'anniversary' : newEventType.value,
    role: newEventRole.value.trim() || undefined,
    giftAdvice: newEventAdvice.value.trim() || undefined,
    isLunar: newEventIsLunar.value,
  }
  try { Object.assign(newEv, validateLifeEvent(newEv)); validateEventList([newEv, ...props.customEvents]) } catch (error) { formError.value = (error as Error).message; return }
  formError.value = ''
  const updated = sortEventsByDaysLeft([newEv, ...props.customEvents])
  emit('update:customEvents', updated)

  newEventTitle.value = ''
  newEventDate.value = ''
  newEventRole.value = ''
  newEventAdvice.value = ''
  newEventType.value = 'birthday'
  newEventIsLunar.value = false
  showAddForm.value = false
}

function removeEvent(id: string) {
  const updated = props.customEvents.filter((e) => e.id !== id)
  emit('update:customEvents', updated)
}
const formError = ref('')
</script>

<template>
  <DetailModal
    title="岁月里程 · 生日与纪念日"
    subtitle="MILESTONES & MEMORIES · 记录每一个重要日子与温暖时刻"
    class="settings-content"
    @close="emit('close')"
  >
    <template #actions>
      <button
        type="button"
        class="icon-button"
        :class="{ active: showAddForm }"
        :title="showAddForm ? '收起新增面板' : '新增日子/纪念日'"
        :aria-label="showAddForm ? '收起新增面板' : '新增日子/纪念日'"
        @click="showAddForm = !showAddForm"
      >
        <Plus :size="18" class="transition-transform duration-200" :class="{ 'rotate-45': showAddForm }" />
      </button>
    </template>

    <div class="p-6 overflow-y-auto grow space-y-4">
      <p v-if="formError" class="account-error" role="alert">{{ formError }}</p>
      <p class="text-xs text-slate-500">农历日程按常规月份计算；当年没有三十日时取廿九，不在闰月重复提醒。公历 2 月 29 日在下一闰年提醒。</p>
      <!-- Add Event Form (默认隐藏，点击右上角“新增”按钮后展示) -->
      <Transition name="fade-slide">
        <div
          v-if="showAddForm"
          class="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              添加新日子 / 备礼提醒
            </div>
            <button
              type="button"
              @click="showAddForm = false"
              class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              收起
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <input
              v-model="newEventTitle"
              type="text"
              placeholder="事件名 (如: 妈妈生日)"
              class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm"
              @input="onTitleChange(newEventTitle)"
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
            <div class="flex items-center gap-2.5">
              <div class="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-900/60 text-xs">
                <button
                  type="button"
                  class="px-2 py-0.5 rounded-md transition"
                  :class="newEventType === 'birthday' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-medium shadow-xs' : 'text-slate-500 hover:text-slate-800'"
                  @click="newEventType = 'birthday'"
                >
                  🎂 生日
                </button>
                <button
                  type="button"
                  class="px-2 py-0.5 rounded-md transition"
                  :class="newEventType === 'anniversary' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-medium shadow-xs' : 'text-slate-500 hover:text-slate-800'"
                  @click="newEventType = 'anniversary'"
                >
                  💖 纪念日
                </button>
              </div>
              <label class="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" v-model="newEventIsLunar" class="rounded text-emerald-600" />
                <span>农历</span>
              </label>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="showAddForm = false"
                class="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs sm:text-sm transition"
              >
                取消
              </button>
              <button
                @click="addEvent"
                class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus class="w-4 h-4" />
                <span>确认添加</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>

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

      <div v-if="!sortedEvents.length" class="p-8 text-center text-sm text-slate-400 space-y-2">
        <div>未找到匹配的纪念日或生日</div>
        <button
          v-if="!searchQuery"
          type="button"
          class="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
          @click="showAddForm = true"
        >
          <Plus :size="13" />
          <span>立即添加第一个日子</span>
        </button>
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
                placeholder="日期 (如: 1990-10-08 或 10-08)"
                class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div class="grid grid-cols-2 gap-2.5">
              <input
                v-model="editForm.role"
                type="text"
                placeholder="角色备注 (如: 母亲 / 朋友)"
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
              <div class="flex items-center gap-2.5">
                <div class="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-900/60 text-xs">
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded-md transition"
                    :class="editForm.type === 'birthday' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-medium shadow-xs' : 'text-slate-500 hover:text-slate-800'"
                    @click="editForm.type = 'birthday'"
                  >
                    🎂 生日
                  </button>
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded-md transition"
                    :class="editForm.type === 'anniversary' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-medium shadow-xs' : 'text-slate-500 hover:text-slate-800'"
                    @click="editForm.type = 'anniversary'"
                  >
                    💖 纪念日
                  </button>
                </div>
                <label class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input type="checkbox" v-model="editForm.isLunar" class="rounded text-emerald-600 focus:ring-emerald-500" />
                  <span>农历</span>
                </label>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="cancelEdit"
                  class="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs sm:text-sm transition"
                >
                  取消
                </button>
                <button
                  @click="saveEdit(ev.id)"
                  class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium transition shadow-sm"
                >
                  保存
                </button>
              </div>
            </div>
          </div>

          <!-- Normal Event Card Display -->
          <div
            v-else
            class="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition flex flex-col justify-between space-y-3.5 relative group"
          >
            <!-- Card Header: Title + Role + Action Buttons -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span
                  class="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  :class="isAnniversaryEvent(ev) ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400' : 'bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400'"
                >
                  <Heart v-if="isAnniversaryEvent(ev)" :size="15" />
                  <Cake v-else :size="15" />
                </span>
                <span class="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate">
                  {{ ev.title }}
                </span>
                <span v-if="ev.role" class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                  {{ ev.role }}
                </span>
              </div>
              <div class="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click="startEdit(ev)"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
                  title="编辑"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="removeEvent(ev.id)"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
                  title="删除"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Countdown Alert Pill & Milestone Year -->
            <div
              class="px-3.5 py-2 rounded-xl flex items-center justify-between"
              :class="[
                getEventCountdown(ev).daysLeft === 0
                  ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 font-semibold'
                  : getEventCountdown(ev).daysLeft <= 7
                    ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/30'
                    : getEventCountdown(ev).daysLeft <= 30
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/30'
                      : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800'
              ]"
            >
              <div class="flex items-center gap-1.5 font-bold text-[15px] sm:text-base tracking-wide">
                <Clock :size="16" />
                <span>{{ getCountdownText(ev) }}</span>
              </div>
              <div v-if="getEventCountdown(ev).turningAge" class="text-sm font-bold">
                {{ isAnniversaryEvent(ev) ? `满 ${getEventCountdown(ev).turningAge} 周年` : `满 ${getEventCountdown(ev).turningAge} 周岁` }}
              </div>
            </div>

            <!-- 核心详情信息：出生日期 / 纪念起始 & 下次过生日 / 纪念日 -->
            <div class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div class="flex items-center justify-between">
                <span class="text-slate-400 dark:text-slate-500 text-xs">
                  {{ isAnniversaryEvent(ev) ? '纪念起始' : '出生日期' }}
                </span>
                <span class="font-medium text-slate-700 dark:text-slate-200 text-sm">
                  {{ getBirthDateDisplay(ev) }}
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-slate-400 dark:text-slate-500 text-xs">
                  {{ isAnniversaryEvent(ev) ? '下次纪念日' : '下次生日' }}
                </span>
                <span class="font-medium text-slate-800 dark:text-slate-100 text-sm">
                  {{ getNextDateDisplay(ev) }}
                </span>
              </div>

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
  </DetailModal>
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.toolbar-button.active,
.icon-button.active {
  background: var(--sage-bg);
  color: var(--accent);
  border-color: rgba(90, 158, 106, 0.4);
}
</style>
