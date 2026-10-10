<script setup lang="ts">
import { ref, computed, nextTick, useId } from 'vue'
import { Plus, Trash2, Pencil, Clock, Search, Heart, Cake, CalendarCheck } from 'lucide-vue-next'
import type { LifeEvent } from '../types'
import {
  calculateNextEventDate,
  sortEventsByDaysLeft,
  isRedundantMemo,
  getSafeLunar,
  isAnniversaryEvent,
  isScheduleEvent,
  getEventCategory,
} from '../services/calendar'
import DetailModal from './DetailModal.vue'
import CalendarTypeSelector from './CalendarTypeSelector.vue'
import EventTypeSelector from './EventTypeSelector.vue'
import EventFormFields from './EventFormFields.vue'
import { validateLifeEvent, validateEventList, parseEventDate } from '../services/validation'

const props = defineProps<{
  customEvents: LifeEvent[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:customEvents', events: LifeEvent[]): void
}>()

// 新增事件表单
const showAddForm = ref(false)
const newEventTitle = ref('')
const newEventDate = ref('')
const newEventStartDate = ref('')
const newEventType = ref<'birthday' | 'anniversary' | 'schedule'>('birthday')
const newEventRole = ref('')
const newEventAdvice = ref('')
const newEventIsLunar = ref(false)
const newEventTypeExplicit = ref(false)

function markNewEventType() {
  newEventTypeExplicit.value = true
  clearFormError('add')
}

function onTitleChange(title: string) {
  if (newEventTypeExplicit.value) return
  if (isAnniversaryEvent({ title })) {
    newEventType.value = 'anniversary'
  } else if (title.includes('生日') || title.includes('生辰') || title.includes('出生') || title.includes('诞辰')) {
    newEventType.value = 'birthday'
  } else if (
    title.includes('到期') ||
    title.includes('年检') ||
    title.includes('保险') ||
    title.includes('考试') ||
    title.includes('体检') ||
    title.includes('日程') ||
    title.includes('计划') ||
    title.includes('待办') ||
    title.includes('出行') ||
    title.includes('返程') ||
    title.includes('还款')
  ) {
    newEventType.value = 'schedule'
  }
}

// 编辑事件表单
const editingId = ref<string | null>(null)
const eventsContent = ref<HTMLElement | null>(null)
let savedCardId: string | null = null
const editForm = ref<{
  title: string
  date: string
  startDate: string
  role: string
  giftAdvice: string
  isLunar: boolean
  type: 'birthday' | 'anniversary' | 'schedule'
}>({
  title: '',
  date: '',
  startDate: '',
  role: '',
  giftAdvice: '',
  isLunar: false,
  type: 'birthday',
})
const editDrafts = new Map<string, typeof editForm.value>()
let originalEdit: typeof editForm.value | null = null

function stashEditDraft() {
  if (!editingId.value) return
  if (JSON.stringify(editForm.value) !== JSON.stringify(originalEdit)) {
    editDrafts.set(editingId.value, { ...editForm.value })
  } else {
    editDrafts.delete(editingId.value)
  }
}

function revealActiveForm() {
  const selector = showAddForm.value ? '.accordion-panel' : '.edit-card-panel'
  eventsContent.value?.querySelector<HTMLElement>(selector)?.scrollIntoView({ behavior: 'instant', block: 'nearest' })
}

function openAddForm() {
  savedCardId = null
  stashEditDraft()
  editingId.value = null
  clearFormError('add')
  clearFormError('edit')
  showAddForm.value = true
}

function collapseAddForm() {
  showAddForm.value = false
  clearFormError('add')
}

function toggleAddForm() {
  if (showAddForm.value) collapseAddForm()
  else openAddForm()
}

async function startEdit(ev: LifeEvent) {
  savedCardId = null
  stashEditDraft()
  showAddForm.value = false
  clearFormError('add')
  clearFormError('edit')
  editingId.value = ev.id
  originalEdit = {
    title: ev.title,
    date: ev.date,
    startDate: ev.startDate || '',
    role: ev.role || '',
    giftAdvice: ev.giftAdvice || '',
    isLunar: !!ev.isLunar,
    type: getEventCategory(ev),
  }
  editForm.value = { ...(editDrafts.get(ev.id) || originalEdit) }

  // Reveal the editor after its taller content updates the card layout.
  await nextTick()
  revealActiveForm()
}

function cancelEdit() {
  if (editingId.value) editDrafts.delete(editingId.value)
  editingId.value = null
  clearFormError('edit')
}

function saveEdit(id: string) {
  const finalType = editForm.value.type

  const payload: LifeEvent = {
    id,
    title: editForm.value.title.trim(),
    date: editForm.value.date.trim(),
    startDate: editForm.value.startDate.trim() || undefined,
    role: editForm.value.role.trim() || undefined,
    giftAdvice: editForm.value.giftAdvice.trim() || undefined,
    isLunar: finalType === 'schedule' ? false : editForm.value.isLunar,
    type: finalType,
  }

  try {
    validateLifeEvent(payload)
  } catch (error) {
    void showFormError('edit', (error as Error).message)
    return
  }
  clearFormError('edit')

  const updatedEvents = props.customEvents.map((ev) => {
    if (ev.id !== id) return ev
    return {
      ...ev,
      title: payload.title,
      date: parseEventDate(payload.date, payload.isLunar)!.date,
      startDate: payload.startDate ? parseEventDate(payload.startDate, payload.isLunar)?.date : undefined,
      type: payload.type,
      role: payload.role,
      giftAdvice: payload.giftAdvice,
      isLunar: payload.isLunar,
    }
  })

  emit('update:customEvents', sortEventsByDaysLeft(updatedEvents))
  editDrafts.delete(id)
  editingId.value = null
  revealSavedEvent(payload)
  void nextTick(revealSavedCard)
}

const searchQuery = ref('')

function matchesSearch(ev: LifeEvent) {
  const q = searchQuery.value.trim().toLowerCase()
  return !q || ev.title.toLowerCase().includes(q) ||
    (ev.role && ev.role.toLowerCase().includes(q)) ||
    ev.date.includes(q) ||
    (ev.startDate && ev.startDate.includes(q)) ||
    (ev.giftAdvice && ev.giftAdvice.toLowerCase().includes(q))
}

const sortedEvents = computed(() => sortEventsByDaysLeft(props.customEvents || []).filter(matchesSearch))

function revealSavedEvent(event: LifeEvent) {
  if (!matchesSearch(event)) searchQuery.value = ''
  savedCardId = event.id
}

function revealSavedCard() {
  if (!savedCardId) { revealActiveForm(); return }
  const card = eventsContent.value?.querySelector<HTMLElement>(`[data-event-id="${savedCardId}"]`)
  card?.scrollIntoView({ behavior: 'instant', block: 'nearest' })
  card?.querySelector<HTMLButtonElement>('button[title="编辑"]')?.focus({ preventScroll: true })
  savedCardId = null
}

function getEventCountdown(ev: LifeEvent) {
  try {
    const isAnniv = isAnniversaryEvent(ev)
    const isSched = isScheduleEvent(ev)
    return calculateNextEventDate(ev?.date || '', !!ev?.isLunar, new Date(), isAnniv, isSched)
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
    if (daysLeft === 0) return getEventCategory(ev) === 'schedule' ? '今天截止' : '今天'
    if (daysLeft === 1) return getEventCategory(ev) === 'schedule' ? '明天截止' : '明天'
    if (daysLeft > 0 && daysLeft <= 999) return `还有 ${daysLeft} 天`
    if (daysLeft > 999) return '待定'
    return '已截止'
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

function getFormattedDate(dateStr?: string, isLunar = false): string {
  if (!dateStr || typeof dateStr !== 'string') return ''
  try {
    const { year, month, day } = parseDateParts(dateStr)
    if (!month || !day) return dateStr

    if (isLunar) {
      const lunar = getSafeLunar(year || 2000, month, day)
      const lunarMonthChinese = lunar.getMonthInChinese()
      const lunarDayChinese = lunar.getDayInChinese()
      const yearPrefix = year ? `${year} 年 ` : ''
      return `${yearPrefix}${lunarMonthChinese}月${lunarDayChinese}（农历）`
    } else {
      const mStr = String(month).padStart(2, '0')
      const dStr = String(day).padStart(2, '0')
      const yearPrefix = year ? `${year} 年 ` : ''
      return `${yearPrefix}${mStr} 月 ${dStr} 日（公历）`
    }
  } catch {
    return dateStr
  }
}

function getBirthDateDisplay(ev: LifeEvent): string {
  return getFormattedDate(ev?.date, ev?.isLunar)
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
  const finalType = newEventType.value

  const newEv: LifeEvent = {
    id: 'evt_' + crypto.randomUUID(),
    title: newEventTitle.value.trim(),
    date: newEventDate.value.trim(),
    startDate: newEventStartDate.value.trim() || undefined,
    type: finalType,
    role: newEventRole.value.trim() || undefined,
    giftAdvice: newEventAdvice.value.trim() || undefined,
    isLunar: finalType === 'schedule' ? false : newEventIsLunar.value,
  }

  try {
    Object.assign(newEv, validateLifeEvent(newEv))
    validateEventList([newEv, ...props.customEvents])
  } catch (error) {
    void showFormError('add', (error as Error).message)
    return
  }
  clearFormError('add')
  const updated = sortEventsByDaysLeft([newEv, ...props.customEvents])
  emit('update:customEvents', updated)
  revealSavedEvent(newEv)
  resetAddForm()
  showAddForm.value = false
}

function resetAddForm() {
  newEventTitle.value = ''
  newEventDate.value = ''
  newEventStartDate.value = ''
  newEventRole.value = ''
  newEventAdvice.value = ''
  newEventType.value = 'birthday'
  newEventIsLunar.value = false
  newEventTypeExplicit.value = false
  clearFormError('add')
}

function cancelAddForm() {
  resetAddForm()
  showAddForm.value = false
}

function removeEvent(id: string) {
  const updated = props.customEvents.filter((e) => e.id !== id)
  emit('update:customEvents', updated)
}

const addError = ref('')
const editError = ref('')
const addInvalidField = ref<string | null>(null)
const editInvalidField = ref<string | null>(null)
const addErrorId = useId()
const editErrorId = useId()

function clearFormError(mode: 'add' | 'edit') {
  if (mode === 'add') { addError.value = ''; addInvalidField.value = null }
  else { editError.value = ''; editInvalidField.value = null }
}

async function showFormError(mode: 'add' | 'edit', message: string) {
  const field = message.includes('起始') ? 'startDate' : message.includes('日期') ? 'date' : message.includes('标题') ? 'title' : null
  if (mode === 'add') { addError.value = message; addInvalidField.value = field }
  else { editError.value = message; editInvalidField.value = field }
  await nextTick()
  const panel = eventsContent.value?.querySelector<HTMLElement>(mode === 'add' ? '.accordion-panel' : '.edit-card-panel')
  panel?.querySelector<HTMLElement>('[role="alert"]')?.scrollIntoView({ behavior: 'instant', block: 'nearest' })
  panel?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus({ preventScroll: true })
}

function onAccordionEnter(el: Element) {
  const element = el as HTMLElement
  element.style.height = '0px'
  element.style.opacity = '0'
  element.style.marginTop = '0px'
  element.style.marginBottom = '0px'
  element.style.transform = 'translateY(-8px)'
  element.style.overflow = 'hidden'
  element.offsetHeight // trigger reflow
  element.style.transition = 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease, transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), margin 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  element.style.height = `${element.scrollHeight}px`
  element.style.marginTop = ''
  element.style.marginBottom = ''
  element.style.opacity = '1'
  element.style.transform = 'translateY(0)'
}

function onAccordionAfterEnter(el: Element) {
  const element = el as HTMLElement
  element.style.height = 'auto'
  element.style.overflow = 'visible'
  element.style.transition = ''
  if (showAddForm.value) revealActiveForm()
}

function onAccordionLeave(el: Element) {
  const element = el as HTMLElement
  element.inert = true
  element.style.height = `${element.scrollHeight}px`
  element.style.overflow = 'hidden'
  element.offsetHeight // trigger reflow
  element.style.transition = 'height 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), margin 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  element.style.height = '0px'
  element.style.marginTop = '0px'
  element.style.marginBottom = '0px'
  element.style.opacity = '0'
  element.style.transform = 'translateY(-8px)'
}
</script>

<template>
  <DetailModal
    title="岁月里程 · 重要日子与日程"
    subtitle="MILESTONES & SCHEDULES · 记录重要日子、温馨时刻与待办日程"
    class="settings-content"
    @close="emit('close')"
  >
    <template #actions>
      <button
        type="button"
        class="icon-button"
        :class="{ active: showAddForm }"
        :title="showAddForm ? '收起新增面板' : '添加日程、生日或纪念日'"
        :aria-label="showAddForm ? '收起新增面板' : '添加日程、生日或纪念日'"
        @click="toggleAddForm"
      >
        <Plus :size="18" class="plus-icon" />
      </button>
    </template>

    <div ref="eventsContent" class="p-6 overflow-y-auto grow space-y-4">
      <p class="text-xs text-slate-500">农历日程按常规月份计算；当年没有三十日时取廿九，不在闰月重复提醒。公历 2 月 29 日在下一闰年提醒。</p>

      <!-- Add Event Form -->
      <Transition
        name="accordion"
        @enter="onAccordionEnter"
        @after-enter="onAccordionAfterEnter"
        @leave="onAccordionLeave"
        @after-leave="revealSavedCard"
      >
        <div v-if="showAddForm" class="accordion-panel" @input="clearFormError('add')">
          <div
            class="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3"
          >
          <div class="flex items-center justify-between">
            <div class="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              添加新日程 / 重要日子
            </div>
            <button
              type="button"
              @click="collapseAddForm"
              class="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              收起
            </button>
          </div>

          <!-- 类型选择 -->
          <div class="flex flex-wrap items-center gap-2">
            <EventTypeSelector v-model="newEventType" @update:model-value="markNewEventType" />
            <CalendarTypeSelector v-if="newEventType !== 'schedule'" v-model="newEventIsLunar" />
          </div>

          <EventFormFields v-model:title="newEventTitle" v-model:date="newEventDate" v-model:start-date="newEventStartDate" v-model:role="newEventRole" v-model:advice="newEventAdvice"
            :type="newEventType" :is-lunar="newEventIsLunar" :error="addError" :error-id="addErrorId" :invalid-field="addInvalidField" @update:title="onTitleChange" />
          <p v-if="addError" :id="addErrorId" class="account-error" role="alert">{{ addError }}</p>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              @click="cancelAddForm"
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
            placeholder="搜索日程、纪念日、姓名或日期..."
            aria-label="搜索重要日子与日程"
            class="attraction-search-input"
          />
        </div>
      </div>

      <div v-if="!sortedEvents.length" class="p-8 text-center text-sm text-slate-400 space-y-2">
        <div>未找到匹配的日程、生日或纪念日</div>
        <button
          v-if="!searchQuery"
          type="button"
          class="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
          @click="openAddForm"
        >
          <Plus :size="13" />
          <span>立即添加第一项日程或纪念日</span>
        </button>
      </div>

      <!-- Existing List in 2-Column Responsive Grid -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <template v-for="ev in sortedEvents" :key="ev.id">
          <!-- Edit form replaces the original card in the same grid cell. -->
          <div
            v-if="editingId === ev.id"
            role="group"
            :aria-label="`编辑${ev.title}`"
            @input="clearFormError('edit')"
            class="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-700/60 space-y-3 text-xs sm:text-sm transition edit-card-panel"
          >
            <!-- 编辑类型切换 -->
            <div class="flex flex-wrap items-center gap-2">
              <EventTypeSelector v-model="editForm.type" @update:model-value="clearFormError('edit')" />
              <CalendarTypeSelector v-if="editForm.type !== 'schedule'" v-model="editForm.isLunar" />
            </div>

            <EventFormFields v-model:title="editForm.title" v-model:date="editForm.date" v-model:start-date="editForm.startDate" v-model:role="editForm.role" v-model:advice="editForm.giftAdvice"
              editing :type="editForm.type" :is-lunar="editForm.isLunar" :error="editError" :error-id="editErrorId" :invalid-field="editInvalidField" />
            <p v-if="editError" :id="editErrorId" class="account-error" role="alert">{{ editError }}</p>

            <div class="flex items-center justify-end gap-2 pt-1">
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

          <!-- Normal Event Card Display -->
          <div
            v-else
            :data-event-id="ev.id"
            class="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition flex flex-col justify-between space-y-3.5 relative group"
          >
            <!-- Card Header: Title + Role + Action Buttons -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span
                  class="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                  :class="[
                    getEventCategory(ev) === 'schedule'
                      ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400'
                      : getEventCategory(ev) === 'anniversary'
                        ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400'
                        : 'bg-amber-50 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400'
                  ]"
                >
                  <CalendarCheck v-if="getEventCategory(ev) === 'schedule'" :size="15" />
                  <Heart v-else-if="getEventCategory(ev) === 'anniversary'" :size="15" />
                  <Cake v-else :size="15" />
                </span>
                <span class="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base truncate">
                  {{ ev.title }}
                </span>
                <span v-if="ev.role" class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                  {{ ev.role }}
                </span>
                <span v-else-if="getEventCategory(ev) === 'schedule'" class="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-900/30 text-[11px] text-teal-600 dark:text-teal-400 shrink-0">
                  日程
                </span>
              </div>
              <div class="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                <button
                  @click="startEdit(ev)"
                  class="min-h-10 min-w-10 p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
                  title="编辑"
                >
                  <Pencil class="w-3.5 h-3.5" />
                </button>
                <button
                  @click="removeEvent(ev.id)"
                  class="min-h-10 min-w-10 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
                  title="删除"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <!-- Countdown Alert Pill & Status -->
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
              <div v-if="getEventCategory(ev) === 'schedule'" class="text-xs font-semibold px-2 py-0.5 rounded-md bg-teal-100/70 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
                {{ getEventCountdown(ev).daysLeft === 0 ? '今日截止' : '待办计划' }}
              </div>
              <div v-else-if="getEventCountdown(ev).turningAge" class="text-sm font-bold">
                {{ getEventCategory(ev) === 'anniversary' ? `满 ${getEventCountdown(ev).turningAge} 周年` : `满 ${getEventCountdown(ev).turningAge} 周岁` }}
              </div>
            </div>

            <!-- 核心详情信息 -->
            <div class="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div class="flex items-center justify-between">
                <span class="text-slate-400 dark:text-slate-500 text-xs">
                  {{
                    getEventCategory(ev) === 'schedule'
                      ? (ev.startDate ? '创建日期' : '事项类型')
                      : getEventCategory(ev) === 'anniversary'
                        ? '纪念起始'
                        : '出生日期'
                  }}
                </span>
                <span class="font-medium text-slate-700 dark:text-slate-200 text-sm">
                  {{
                    getEventCategory(ev) === 'schedule'
                      ? (ev.startDate ? getFormattedDate(ev.startDate, ev.isLunar) : '日程待办 / 截止提醒')
                      : getBirthDateDisplay(ev)
                  }}
                </span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-slate-400 dark:text-slate-500 text-xs">
                  {{
                    getEventCategory(ev) === 'schedule'
                      ? '截止日期'
                      : getEventCategory(ev) === 'anniversary'
                        ? '下次纪念日'
                        : '下次生日'
                  }}
                </span>
                <span class="font-medium text-slate-800 dark:text-slate-100 text-sm">
                  {{ getNextDateDisplay(ev) }}
                </span>
              </div>

              <div
                v-if="ev.giftAdvice && !isRedundantMemo(ev.giftAdvice)"
                class="flex items-center justify-between pt-1.5 text-xs text-amber-600 dark:text-amber-400 border-t border-dashed border-slate-100 dark:border-slate-800"
              >
                <span class="text-slate-400 dark:text-slate-500">
                  {{ getEventCategory(ev) === 'birthday' ? '备礼建议' : '事项备忘' }}
                </span>
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
.accordion-panel {
  will-change: height, opacity, transform;
}

.accordion-panel button, .edit-card-panel button { min-height: 40px; min-width: 40px; }

.icon-button {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.icon-button .plus-icon {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.icon-button.active .plus-icon {
  transform: rotate(45deg);
}

.edit-card-panel {
  scroll-margin-block: 12px;
  animation: editFadeSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes editFadeSlide {
  from {
    opacity: 0;
    transform: scale(0.985) translateY(-4px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

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
