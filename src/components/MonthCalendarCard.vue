<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-vue-next'
import { Solar, HolidayUtil } from 'lunar-javascript'
import type { LifeEvent } from '../types'

const props = defineProps<{
  events?: LifeEvent[]
}>()

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)
const selectedDateStr = ref<string>(
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
)

const isCurrentViewToday = computed(() => {
  return currentYear.value === now.getFullYear() && currentMonth.value === (now.getMonth() + 1)
})

const WEEKDAYS = [
  { label: '一', isWeekend: false },
  { label: '二', isWeekend: false },
  { label: '三', isWeekend: false },
  { label: '四', isWeekend: false },
  { label: '五', isWeekend: false },
  { label: '六', isWeekend: true },
  { label: '日', isWeekend: true },
]

interface CalendarCell {
  year: number
  month: number
  day: number
  dateStr: string
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
  badge: '休' | '班' | null
  holidayName?: string
  subText: string
  subType: 'festival' | 'jieqi' | 'lunar'
  hasEvent: boolean
  eventTitle?: string
  lunarFullStr: string
}

const calendarCells = computed<CalendarCell[]>(() => {
  const y = currentYear.value
  const m = currentMonth.value

  const firstSolar = Solar.fromYmd(y, m, 1)
  const firstWeek = firstSolar.getWeek() // 0=Sun, 1=Mon, ..., 6=Sat
  const monStartOffset = (firstWeek + 6) % 7 // 0=Mon, ..., 6=Sun

  const daysInCurrentMonth = new Date(y, m, 0).getDate()
  const daysInPrevMonth = new Date(y, m - 1, 0).getDate()

  const rawList: { year: number; month: number; day: number; isCurrentMonth: boolean }[] = []

  // Prev month padding
  for (let i = monStartOffset - 1; i >= 0; i--) {
    const prevM = m === 1 ? 12 : m - 1
    const prevY = m === 1 ? y - 1 : y
    rawList.push({ year: prevY, month: prevM, day: daysInPrevMonth - i, isCurrentMonth: false })
  }

  // Current month
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    rawList.push({ year: y, month: m, day: d, isCurrentMonth: true })
  }

  // Next month padding to 35 or 42
  const targetTotal = rawList.length > 35 ? 42 : 35
  const remaining = targetTotal - rawList.length
  for (let d = 1; d <= remaining; d++) {
    const nextM = m === 12 ? 1 : m + 1
    const nextY = m === 12 ? y + 1 : y
    rawList.push({ year: nextY, month: nextM, day: d, isCurrentMonth: false })
  }

  const todayY = now.getFullYear()
  const todayM = now.getMonth() + 1
  const todayD = now.getDate()

  const eventsMap = new Map<string, string>()
  if (props.events) {
    for (const ev of props.events) {
      if (ev.date) {
        // e.g. "10-08" or "2026-10-08"
        const clean = ev.date.length === 5 ? ev.date : ev.date.slice(-5)
        eventsMap.set(clean, ev.title)
      }
    }
  }

  return rawList.map((item) => {
    const dateStr = `${item.year}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`
    const isToday = item.year === todayY && item.month === todayM && item.day === todayD

    const solar = Solar.fromYmd(item.year, item.month, item.day)
    const lunar = solar.getLunar()
    const weekIndex = (solar.getWeek() + 6) % 7
    const isWeekend = weekIndex === 5 || weekIndex === 6

    const holiday = HolidayUtil.getHoliday(item.year, item.month, item.day)
    let badge: '休' | '班' | null = null
    let holidayName: string | undefined
    if (holiday) {
      badge = holiday.isWork() ? '班' : '休'
      holidayName = holiday.getName()
    }

    const sFest = solar.getFestivals()
    const lFest = lunar.getFestivals()
    const jieqi = lunar.getJieQi()

    let subText = ''
    let subType: 'festival' | 'jieqi' | 'lunar' = 'lunar'

    const shortLFest = lFest.find((f: string) => f.length <= 4)
    const shortSFest = sFest.find((f: string) => f.length <= 4)

    if (shortLFest) {
      subText = shortLFest
      subType = 'festival'
    } else if (shortSFest) {
      subText = shortSFest
      subType = 'festival'
    } else if (jieqi) {
      subText = jieqi
      subType = 'jieqi'
    } else {
      subText = lunar.getDayInChinese()
      subType = 'lunar'
    }

    const monthDayKey = `${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`
    const hasEvent = eventsMap.has(monthDayKey)
    const eventTitle = eventsMap.get(monthDayKey)

    const lunarFullStr = `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`

    return {
      year: item.year,
      month: item.month,
      day: item.day,
      dateStr,
      isCurrentMonth: item.isCurrentMonth,
      isToday,
      isWeekend,
      badge,
      holidayName,
      subText,
      subType,
      hasEvent,
      eventTitle,
      lunarFullStr,
    }
  })
})

const selectedDayDetail = computed(() => {
  if (!selectedDateStr.value) return null
  const cell = calendarCells.value.find((c) => c.dateStr === selectedDateStr.value)
  if (!cell) return null

  let extra = ''
  if (cell.holidayName) {
    extra = `${cell.holidayName} (${cell.badge === '休' ? '放假' : '调休补班'})`
  } else if (cell.subType === 'jieqi') {
    extra = `节气 · ${cell.subText}`
  } else if (cell.subType === 'festival') {
    extra = cell.subText
  }
  if (cell.hasEvent && cell.eventTitle) {
    extra = extra ? `${extra} · ${cell.eventTitle}` : cell.eventTitle
  }

  return {
    dateStr: `${cell.year}年${cell.month}月${cell.day}日`,
    lunarStr: cell.lunarFullStr,
    detailExtra: extra,
  }
})

function prevMonth() {
  if (currentMonth.value === 1) {
    currentYear.value--
    currentMonth.value = 12
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentYear.value++
    currentMonth.value = 1
  } else {
    currentMonth.value++
  }
}

function goToday() {
  currentYear.value = now.getFullYear()
  currentMonth.value = now.getMonth() + 1
  selectedDateStr.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function selectCell(cell: CalendarCell) {
  selectedDateStr.value = cell.dateStr
  if (!cell.isCurrentMonth) {
    currentYear.value = cell.year
    currentMonth.value = cell.month
  }
}
</script>

<template>
  <article class="glass-panel dashboard-card month-calendar-card" aria-label="月历">
    <header class="card-heading">
      <div class="section-label">
        <span class="icon-tile sage"><CalendarDays :size="17" /></span>
        <h2>{{ currentYear }} 年 {{ currentMonth }} 月</h2>
        <span v-if="isCurrentViewToday" class="current-month-badge">本月</span>
      </div>
      <div class="cal-controls">
        <button class="icon-button small" aria-label="上一月" type="button" @click="prevMonth">
          <ChevronLeft :size="16" />
        </button>
        <button v-if="!isCurrentViewToday" class="cal-today-pill" type="button" @click="goToday">
          今天
        </button>
        <button class="icon-button small" aria-label="下一月" type="button" @click="nextMonth">
          <ChevronRight :size="16" />
        </button>
      </div>
    </header>

    <!-- 星期表头 -->
    <div class="cal-week-row">
      <span
        v-for="w in WEEKDAYS"
        :key="w.label"
        class="cal-week-cell"
        :class="{ weekend: w.isWeekend }"
      >
        {{ w.label }}
      </span>
    </div>

    <!-- 7列网格日历 -->
    <div class="cal-grid">
      <button
        v-for="cell in calendarCells"
        :key="cell.dateStr"
        type="button"
        class="cal-cell"
        :class="{
          'other-month': !cell.isCurrentMonth,
          'is-today': cell.isToday,
          'is-selected': selectedDateStr === cell.dateStr,
          'is-weekend': cell.isWeekend,
          'is-rest': cell.badge === '休',
          'is-work': cell.badge === '班',
          'has-event': cell.hasEvent,
        }"
        @click="selectCell(cell)"
      >
        <!-- 标签：休 / 班 / 今 -->
        <span v-if="cell.isToday" class="cell-badge badge-today">今</span>
        <span v-else-if="cell.badge === '休'" class="cell-badge badge-rest">休</span>
        <span v-else-if="cell.badge === '班'" class="cell-badge badge-work">班</span>

        <!-- 公历日期数字 -->
        <span class="cell-solar-num">{{ cell.day }}</span>

        <!-- 农历 / 节气 / 节日 -->
        <span
          class="cell-sub-text"
          :class="[
            cell.subType,
            {
              'is-rest-text': cell.badge === '休' || (cell.isWeekend && cell.badge !== '班' && cell.subType === 'festival'),
              'is-work-text': cell.badge === '班',
            }
          ]"
        >
          {{ cell.subText }}
        </span>

        <!-- 纪念日标记圆点 -->
        <span v-if="cell.hasEvent" class="cell-event-dot" :title="cell.eventTitle"></span>
      </button>
    </div>

    <!-- 底部状态说明与选中日期详情 -->
    <footer class="card-footer cal-footer">
      <div v-if="selectedDayDetail" class="cal-selected-info">
        <span class="detail-solar">{{ selectedDayDetail.dateStr }}</span>
        <span class="detail-lunar">农历{{ selectedDayDetail.lunarStr }}</span>
        <span v-if="selectedDayDetail.detailExtra" class="detail-extra">{{ selectedDayDetail.detailExtra }}</span>
      </div>
      <div class="cal-legend">
        <span class="legend-item"><span class="cell-badge badge-rest mini">休</span> 放假</span>
        <span class="legend-item"><span class="cell-badge badge-work mini">班</span> 调休</span>
      </div>
    </footer>
  </article>
</template>
