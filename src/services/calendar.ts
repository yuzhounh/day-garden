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
  termSummary: string
}

const WEEK_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export function getTodayCalendarInfo(date: Date = new Date()): TodayCalendarInfo {
  const solar = Solar.fromDate(date)
  const lunar = solar.getLunar()

  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const solarDateStr = `${year}年${month}月${day}日`
  const dayOfWeek = WEEK_NAMES[date.getDay()]

  const lunarMonthStr = lunar.getMonthInChinese() + '月'
  const lunarDayStr = lunar.getDayInChinese()
  const ganzhiYear = lunar.getYearInGanZhi() + '年'
  const zodiac = lunar.getYearShengXiao()

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
    termSummary,
  }
}

/**
 * 计算事件下一个发生日期及距今天数
 */
export function calculateNextEventDate(
  eventDateStr: string,
  isLunar: boolean = false,
  baseDate: Date = new Date()
): { daysLeft: number; nextDateStr: string } {
  const baseYear = baseDate.getFullYear()
  baseDate.setHours(0, 0, 0, 0)

  // 假设 eventDateStr 格式为 "MM-DD" 或 "YYYY-MM-DD"
  const parts = eventDateStr.split('-')
  let m = 0
  let d = 0
  if (parts.length === 2) {
    m = parseInt(parts[0], 10)
    d = parseInt(parts[1], 10)
  } else if (parts.length === 3) {
    m = parseInt(parts[1], 10)
    d = parseInt(parts[2], 10)
  }

  if (isLunar) {
    // 农历生日计算今年或明年的公历对应日
    let targetSolar = Lunar.fromYmd(baseYear, m, d).getSolar()
    let targetDate = new Date(targetSolar.getYear(), targetSolar.getMonth() - 1, targetSolar.getDay())
    targetDate.setHours(0, 0, 0, 0)

    if (targetDate.getTime() < baseDate.getTime()) {
      targetSolar = Lunar.fromYmd(baseYear + 1, m, d).getSolar()
      targetDate = new Date(targetSolar.getYear(), targetSolar.getMonth() - 1, targetSolar.getDay())
      targetDate.setHours(0, 0, 0, 0)
    }

    const diffMs = targetDate.getTime() - baseDate.getTime()
    const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24))
    const nextDateStr = `${targetDate.getMonth() + 1}月${targetDate.getDate()}日 (农历${m}月${d})`
    return { daysLeft, nextDateStr }
  } else {
    // 公历
    let targetDate = new Date(baseYear, m - 1, d)
    targetDate.setHours(0, 0, 0, 0)

    if (targetDate.getTime() < baseDate.getTime()) {
      targetDate = new Date(baseYear + 1, m - 1, d)
      targetDate.setHours(0, 0, 0, 0)
    }

    const diffMs = targetDate.getTime() - baseDate.getTime()
    const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24))
    const nextDateStr = `${targetDate.getMonth() + 1}月${targetDate.getDate()}日`
    return { daysLeft, nextDateStr }
  }
}

/**
 * 汇总即将到来的生活事件与节假日（按距离天数升序）
 */
export function getUpcomingEvents(customEvents: LifeEvent[], daysThreshold: number = 30): LifeEvent[] {
  const allEvents: LifeEvent[] = []
  const now = new Date()

  // 1. 节假日
  for (const h of rawHolidays) {
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
  }

  // 2. 自定义事件（家人朋友生日、重要纪念日）
  for (const ev of customEvents) {
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
