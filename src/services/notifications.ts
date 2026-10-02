import type { LifeEvent } from '../types'
import { localDateKey } from './day'
import { sendDesktopNotification } from './calendar'
import { saveLocal } from './persistence'

const sessionSent = new Map<string, { date: string; sent: Set<string> }>()

export function notifyUpcomingEvents(events: LifeEvent[], userId?: string, date = localDateKey(), notify = sendDesktopNotification): number {
  const key = 'daygarden_notifications_' + (userId || 'guest')
  let sent = sessionSent.get(key)?.date === date ? sessionSent.get(key)!.sent : new Set<string>()
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null')
    if (stored?.date === date && Array.isArray(stored.sent)) for (const id of stored.sent) if (typeof id === 'string') sent.add(id)
  } catch { /* Notifications still work if the previous record is unreadable. */ }
  let count = 0
  for (const event of events) {
    if (event.type === 'holiday' || ![0, 3, 14].includes(event.daysLeft ?? -1)) continue
    const id = event.id + ':' + event.daysLeft
    if (sent.has(id)) continue
    const body = event.daysLeft === 0 ? `今天是${event.title}，记得送上祝福。` : `${event.title}还有 ${event.daysLeft} 天，可以开始准备了。`
    if (notify('Day Garden · 重要日子', body)) { sent.add(id); count++ }
  }
  sessionSent.set(key, { date, sent })
  if (count) saveLocal(key, { date, sent: [...sent] })
  return count
}
