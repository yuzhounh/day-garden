import { Solar, Lunar } from 'lunar-javascript'
import type { LifeEvent } from '../types'
import rawHolidays from '../data/holidays.json'

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

function getSafeLunar(year: number, month: number, day: number) {
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

export function calculateNextEventDate(
  eventDateStr: string,
  isLunar: boolean = false,
  baseDate: Date = new Date()
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
    const cleanStr = eventDateStr.trim().replace(/[/. 年月]/g, '-').replace(/日$/, '')
    const parts = cleanStr.split('-').filter(Boolean)

    let m = 0
    let d = 0
    let birthYear: number | undefined

    if (parts.length === 2) {
      m = parseInt(parts[0], 10)
      d = parseInt(parts[1], 10)
    } else if (parts.length >= 3) {
      const y = parseInt(parts[0], 10)
      if (!Number.isNaN(y) && y > 1900 && y < 2200) birthYear = y
      m = parseInt(parts[1], 10)
      d = parseInt(parts[2], 10)
    }

    if (Number.isNaN(m) || Number.isNaN(d) || m < 1 || m > 12 || d < 1 || d > 31) {
      return fallbackInfo
    }

    if (isLunar) {
      // 农历生日计算今年或明年的公历对应日
      let lunarObj = getSafeLunar(baseYear, m, d)
      let targetSolar = lunarObj.getSolar()
      let targetDate = new Date(targetSolar.getYear(), targetSolar.getMonth() - 1, targetSolar.getDay())
      targetDate.setHours(0, 0, 0, 0)

      if (targetDate.getTime() < safeBaseDate.getTime()) {
        lunarObj = getSafeLunar(baseYear + 1, m, d)
        targetSolar = lunarObj.getSolar()
        targetDate = new Date(targetSolar.getYear(), targetSolar.getMonth() - 1, targetSolar.getDay())
        targetDate.setHours(0, 0, 0, 0)
      }

      const diffMs = targetDate.getTime() - safeBaseDate.getTime()
      const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24))
      const turningAge = birthYear ? targetSolar.getLunar().getYear() - birthYear : undefined
      const ageStr = turningAge !== undefined ? ` · ${turningAge}岁` : ''
      const targetLunar = targetSolar.getLunar()
      const lunarChineseStr = `农历${targetLunar.getMonthInChinese()}月${targetLunar.getDayInChinese()}`
      const nextDateSolar = `${targetDate.getMonth() + 1}月${targetDate.getDate()}日`
      const nextDateStr = `${nextDateSolar} (${lunarChineseStr}${ageStr})`
      return {
        daysLeft,
        nextDateStr,
        nextDateSolar,
        nextDateLunar: lunarChineseStr,
        turningAge,
      }
    } else {
      // 公历
      let targetDate = new Date(baseYear, m - 1, d)
      targetDate.setHours(0, 0, 0, 0)

      if (targetDate.getTime() < safeBaseDate.getTime()) {
        targetDate = new Date(baseYear + 1, m - 1, d)
        targetDate.setHours(0, 0, 0, 0)
      }

      const diffMs = targetDate.getTime() - safeBaseDate.getTime()
      const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24))
      const turningAge = birthYear ? targetDate.getFullYear() - birthYear : undefined
      const ageStr = turningAge !== undefined ? ` · ${turningAge}岁` : ''
      const nextDateSolar = `${targetDate.getMonth() + 1}月${targetDate.getDate()}日`
      const nextDateStr = `${nextDateSolar}${ageStr}`
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
      const da = calculateNextEventDate(a?.date || '', !!a?.isLunar, base).daysLeft
      const db = calculateNextEventDate(b?.date || '', !!b?.isLunar, base).daysLeft
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
      const calc = calculateNextEventDate(h.date, false, new Date(now))
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

  // 2. 自定义事件（家人朋友生日、重要纪念日）
  for (const ev of safeEvents) {
    try {
      const calc = calculateNextEventDate(ev.date, !!ev.isLunar, new Date(now))
      if (calc.daysLeft <= daysThreshold) {
        let urgencyLevel: LifeEvent['urgencyLevel'] = 'normal'
        if (calc.daysLeft === 0) urgencyLevel = 'today'
        else if (calc.daysLeft <= 3) urgencyLevel = 'near'
        else if (calc.daysLeft <= 14) urgencyLevel = 'advance'

        allEvents.push({
          ...ev,
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
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/favicon.ico',
    })
  } catch (err) {
    console.warn('Failed to send notification:', err)
  }
}
