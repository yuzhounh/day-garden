import { Solar, Lunar } from 'lunar-javascript'
import type { LifeEvent } from '../types'
import rawHolidays from '../data/holidays.json'
import { parseEventDate } from './validation'

export interface TodayCalendarInfo {
  solarDateStr: string
  dayOfWeek: string
  lunarMonthStr: string
  lunarDayStr: string
  solarTerm: string
  ganzhiYear: string
  zodiac: string
  lunarYearStr: string
  termSummary: string
}

const WEEK_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export function getTodayCalendarInfo(date: Date = new Date()): TodayCalendarInfo {
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const solarDateStr = `${year}年${month}月${day}日`
  const dayOfWeek = WEEK_NAMES[date.getDay()]

  const lunarMonthStr = lunar.getMonthInChinese() + '月'
  const lunarDayStr = lunar.getDayInChinese()
  const ganzhiYear = lunar.getYearInGanZhi() + '年'
  const zodiac = lunar.getYearShengXiao()
  const lunarYearStr = `${lunar.getYearInGanZhi()}${zodiac}年`

  // 节气
  const prevJieQi = lunar.getPrevJieQi()
  const nextJieQi = lunar.getNextJieQi()
  const currentJieQi = lunar.getJieQi()

  let solarTerm = currentJieQi || prevJieQi.getName()
  let termSummary = ''

  if (currentJieQi) {
    termSummary = `今日适逢 ${currentJieQi}`
  } else {
    // 算距离前一个节气多少天
    const prevSolar = prevJieQi.getSolar()
    const prevDate = new Date(prevSolar.getYear(), prevSolar.getMonth() - 1, prevSolar.getDay())
    const diffDays = Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
    termSummary = `${prevJieQi.getName()}后第 ${diffDays} 天 · 近${nextJieQi.getName()}`
  }

  return {
    solarDateStr,
    dayOfWeek,
    lunarMonthStr,
    lunarDayStr,
    solarTerm,
    ganzhiYear,
    zodiac,
    lunarYearStr,
    termSummary,
  }
}

/**
 * 计算事件下一个发生日期及距今天数
 */
export interface NextEventInfo {
  daysLeft: number
  nextDateStr: string
  nextDateSolar: string
  nextDateLunar?: string
  turningAge?: number
}

export function getSafeLunar(year: number, month: number, day: number) {
  // 农历月中部分月份仅有29天或闰月不同，自指定日期递减寻找合法日子，防止抛出异常
  const safeMonth = Math.max(1, Math.min(12, month))
  const startDay = Math.max(1, Math.min(30, day))
  for (let tryDay = startDay; tryDay >= 1; tryDay--) {
    try {
      return Lunar.fromYmd(year, safeMonth, tryDay)
    } catch {
      // 捕获当月无此日期的异常并继续回退
    }
  }
  return Lunar.fromYmd(year, safeMonth, 1)
}

/** Recurrences use the regular lunar month; a missing lunar day 30 uses day 29. */
export function eventDateInYear(date: string, isLunar: boolean, year: number): Date | null {
  const parsed = parseEventDate(date, isLunar)
  if (!parsed || (parsed.year !== undefined && parsed.year > year)) return null
  if (isLunar) {
    const solar = getSafeLunar(year, parsed.month, parsed.day).getSolar()
    return new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay())
  }
  const target = new Date(year, parsed.month - 1, parsed.day)
  return target.getMonth() === parsed.month - 1 && target.getDate() === parsed.day ? target : null
}

export function eventsBySolarDate(events: LifeEvent[], years: number[]): Map<string, LifeEvent[]> {
  const result = new Map<string, LifeEvent[]>()
  const lunarYears = [...new Set(years.flatMap(year => [year - 1, year, year + 1]))]
  for (const event of events) {
    for (const year of event.isLunar ? lunarYears : years) {
      const date = eventDateInYear(event.date, !!event.isLunar, year)
      if (!date || !years.includes(date.getFullYear())) continue
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const list = result.get(key) || []
      if (!list.some(item => item.id === event.id)) list.push(event)
      result.set(key, list)
    }
  }
  return result
}

/**
 * 判断是否为机械式重复生成的年龄/生日/出生日期备注
 */
export function isRedundantMemo(memo?: unknown): boolean {
  if (!memo || typeof memo !== 'string') return true
  const trimmed = memo.trim()
  if (!trimmed || trimmed === '无备忘' || trimmed === '暂无备忘' || trimmed === '无') return true
  // 过滤机械式自动生成的年龄/生日备注，如 "16岁生日 (阳历10月5日)"、"48岁生日 (农历九月廿三)"、"1岁生日"
  if (/^\d+岁生日(\s*\(.+?\))?$/.test(trimmed)) return true
  // 过滤机械式重复出生日期的备注，如 "阳历3月8日出生"、"公历3月8日出生"、"农历九月廿三出生"、"阳历3月8日"
  if (/^[公阳农]历\s*(\d+月\d+日?|[一二三四五六七八九十冬腊]+月[一二三四五六七八九十廿卅]+)?\s*出生?$/.test(trimmed)) return true
  return false
}

export type EventCategory = 'birthday' | 'anniversary' | 'schedule'

/**
 * 智能判定一个事件是否属于周年纪念日（非生日、非日程）
 */
export function isAnniversaryEvent(ev?: { type?: string; title?: string } | null): boolean {
  if (!ev) return false
  if (ev.type === 'schedule' || ev.type === 'birthday') return false
  const title = (ev.title || '').trim().toLowerCase()
  if (title.includes('到期') || title.includes('年检') || title.includes('保险') || title.includes('行程') || title.includes('计划') || title.includes('待办') || title.includes('还款')) {
    return false
  }
  if (ev.type === 'anniversary') return true
  if (
    title.includes('纪念') ||
    title.includes('周年') ||
    title.includes('结婚') ||
    title.includes('领证') ||
    title.includes('相识') ||
    title.includes('相恋') ||
    title.includes('在一起') ||
    title.includes('入职') ||
    title.includes('入伍') ||
    title.includes('毕业') ||
    title.includes('买房') ||
    title.includes('乔迁') ||
    title.includes('提车') ||
    title.includes('开业') ||
    title.includes('创办')
  ) {
    return true
  }
  return false
}

/**
 * 智能判定一个事件是否属于日程计划/截止事项
 */
export function isScheduleEvent(ev?: { type?: string; title?: string } | null): boolean {
  if (!ev) return false
  if (ev.type === 'schedule') return true
  if (ev.type === 'birthday' || ev.type === 'anniversary') return false
  if (isAnniversaryEvent(ev)) return false
  const title = (ev.title || '').trim().toLowerCase()
  if (title.includes('生日') || title.includes('生辰') || title.includes('出生') || title.includes('诞辰')) {
    return false
  }
  return true
}

/**
 * 获取事件的明确分类（生日 / 纪念日 / 日程）
 */
export function getEventCategory(ev?: { type?: string; title?: string } | null): EventCategory {
  if (!ev) return 'schedule'
  if (ev.type === 'birthday') return 'birthday'
  if (ev.type === 'anniversary') return 'anniversary'
  if (ev.type === 'schedule') return 'schedule'
  if (isAnniversaryEvent(ev)) return 'anniversary'
  const title = (ev.title || '').trim().toLowerCase()
  if (title.includes('生日') || title.includes('生辰') || title.includes('出生') || title.includes('诞辰')) {
    return 'birthday'
  }
  return 'schedule'
}

export function calculateNextEventDate(
  eventDateStr: string,
  isLunar: boolean = false,
  baseDate: Date = new Date(),
  isAnniversary: boolean = false,
  isSchedule: boolean = false
): NextEventInfo {
  const fallbackInfo: NextEventInfo = {
    daysLeft: 9999,
    nextDateStr: eventDateStr || '未定',
    nextDateSolar: eventDateStr || '未定',
  }

  if (!eventDateStr || typeof eventDateStr !== 'string') {
    return fallbackInfo
  }

  try {
    const baseYear = baseDate.getFullYear()
    const safeBaseDate = new Date(baseDate.getTime())
    safeBaseDate.setHours(0, 0, 0, 0)

    // 标准化分隔符（支持 "-"、"/"、"."、"年/月/日"、空格）
    const parsed = parseEventDate(eventDateStr, isLunar)
    if (!parsed) return fallbackInfo
    const { year: birthYear } = parsed

    if (isLunar) {
      // 农历计算今年或明年的公历对应日
      const candidates = [baseYear - 1, baseYear, baseYear + 1, baseYear + 2]
        .map(year => eventDateInYear(eventDateStr, true, year))
        .filter((date): date is Date => !!date && date.getTime() >= safeBaseDate.getTime())
        .sort((a, b) => a.getTime() - b.getTime())
      const targetDate = candidates[0]
      if (!targetDate) return fallbackInfo
      const targetSolar = Solar.fromDate(targetDate)

      const diffMs = targetDate.getTime() - safeBaseDate.getTime()
      const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24))
      const turningAge = (!isSchedule && birthYear) ? targetSolar.getLunar().getYear() - birthYear : undefined
      const targetLunar = targetSolar.getLunar()
      const lunarChineseStr = `农历${targetLunar.getMonthInChinese()}月${targetLunar.getDayInChinese()}`
      const nextDateSolar = `${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月${targetDate.getDate()}日`
      const unit = isAnniversary ? '周年' : '岁'
      const nextDateStr = turningAge !== undefined
        ? `${nextDateSolar} · ${turningAge}${unit} · ${lunarChineseStr}`
        : `${nextDateSolar} · ${lunarChineseStr}`
      return {
        daysLeft,
        nextDateStr,
        nextDateSolar,
        nextDateLunar: lunarChineseStr,
        turningAge,
      }
    } else {
      // 公历
      let targetDate: Date | null = null
      for (let year = Math.max(baseYear, birthYear ?? baseYear); year <= Math.max(baseYear, birthYear ?? baseYear) + 8; year++) {
        const candidate = eventDateInYear(eventDateStr, false, year)
        if (candidate && candidate.getTime() >= safeBaseDate.getTime()) { targetDate = candidate; break }
      }
      if (!targetDate) return fallbackInfo

      const diffMs = targetDate.getTime() - safeBaseDate.getTime()
      const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24))
      const turningAge = (!isSchedule && birthYear) ? targetDate.getFullYear() - birthYear : undefined
      const nextDateSolar = `${targetDate.getFullYear()}年${targetDate.getMonth() + 1}月${targetDate.getDate()}日`
      const unit = isAnniversary ? '周年' : '岁'
      const nextDateStr = turningAge !== undefined
        ? `${nextDateSolar} · ${turningAge}${unit}`
        : nextDateSolar
      return {
        daysLeft,
        nextDateStr,
        nextDateSolar,
        turningAge,
      }
    }
  } catch (err) {
    console.warn('calculateNextEventDate failed safely:', err)
    return fallbackInfo
  }
}

/**
 * 按距离下一次发生的剩余天数升序排序自定义事件（距离越近排越前）
 */
export function sortEventsByDaysLeft(events?: LifeEvent[] | null, baseDate?: Date): LifeEvent[] {
  if (!Array.isArray(events)) return []
  const base = baseDate || new Date()
  return [...events].sort((a, b) => {
    try {
      const da = calculateNextEventDate(a?.date || '', !!a?.isLunar, base, isAnniversaryEvent(a)).daysLeft
      const db = calculateNextEventDate(b?.date || '', !!b?.isLunar, base, isAnniversaryEvent(b)).daysLeft
      const safeA = da < 0 ? 999999 : da
      const safeB = db < 0 ? 999999 : db
      return safeA - safeB
    } catch {
      return 0
    }
  })
}

/**
 * 汇总即将到来的生活事件与节假日（按距离天数升序）
 */
export function getUpcomingEvents(customEvents?: LifeEvent[] | null, daysThreshold: number = 30): LifeEvent[] {
  const allEvents: LifeEvent[] = []
  const now = new Date()
  const safeEvents = Array.isArray(customEvents) ? customEvents : []

  // 1. 节假日
  for (const h of rawHolidays) {
    try {
      const calc = calculateNextEventDate(h.date, false, new Date(now), false)
      if (calc.daysLeft <= daysThreshold) {
        allEvents.push({
          id: h.id,
          title: h.name,
          date: h.date,
          type: 'holiday',
          giftAdvice: h.desc,
          daysLeft: calc.daysLeft,
          nextDateStr: calc.nextDateStr,
          urgencyLevel: calc.daysLeft === 0 ? 'today' : calc.daysLeft <= 3 ? 'near' : 'normal',
        })
      }
    } catch {
      // 容错忽略单个节假日计算异常
    }
  }

  // 2. 自定义事件（家人朋友生日、重要纪念日、重要日程）
  for (const ev of safeEvents) {
    try {
      const isAnniv = isAnniversaryEvent(ev)
      const isSchedule = isScheduleEvent(ev)
      const calc = calculateNextEventDate(ev.date, !!ev.isLunar, new Date(now), isAnniv, isSchedule)
      if (calc.daysLeft <= daysThreshold) {
        let urgencyLevel: LifeEvent['urgencyLevel'] = 'normal'
        if (calc.daysLeft === 0) urgencyLevel = 'today'
        else if (calc.daysLeft <= 3) urgencyLevel = 'near'
        else if (calc.daysLeft <= 14) urgencyLevel = 'advance'

        allEvents.push({
          ...ev,
          type: getEventCategory(ev),
          giftAdvice: isRedundantMemo(ev.giftAdvice) ? undefined : ev.giftAdvice,
          daysLeft: calc.daysLeft,
          nextDateStr: calc.nextDateStr,
          urgencyLevel,
        })
      }
    } catch {
      // 容错忽略单个事件计算异常
    }
  }

  // 按天数升序排序
  return allEvents.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
}

/**
 * 请求系统桌面通知权限并触发
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

export function sendDesktopNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
    })
    return true
  } catch (err) {
    console.warn('Failed to send notification:', err)
    return false
  }
}
