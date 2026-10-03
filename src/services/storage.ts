import type { UserPreferences, LifeEvent, QuickNote } from '../types'
import { DEFAULT_CITIES } from './weather'
import { sortEventsByDaysLeft, isRedundantMemo, isAnniversaryEvent } from './calendar'
import { isRecord, validateEventList, validateLifeEvent, validateCityOption } from './validation'
import { saveLocal } from './persistence'

const STORAGE_KEY = 'daygarden_user_preferences_v1'
const LEGACY_STORAGE_KEY = 'daybloom_user_preferences_v1'
const NOTES_STORAGE_KEY = 'daygarden_quick_notes_v1'

export const DEFAULT_CARD_ORDER: string[] = [
  'calendar',
  'quickNotes',
  'upcoming',
  'gardenAudio',
  'chinaAttractions',
  'seasonal',
  'evidence',
  'sportsExercise',
  'dailyPoetry',
  'inspirationalQuote',
]

const LEGACY_DEFAULT_ORDERS: string[][] = [
  [
    'calendar',
    'upcoming',
    'gardenAudio',
    'dailyPoetry',
    'inspirationalQuote',
    'quickNotes',
    'seasonal',
    'evidence',
    'chinaAttractions',
    'sportsExercise',
  ],
  [
    'calendar',
    'upcoming',
    'quickNotes',
    'gardenAudio',
    'seasonal',
    'dailyPoetry',
    'inspirationalQuote',
    'evidence',
    'chinaAttractions',
    'sportsExercise',
  ],
  [
    'calendar',
    'quickNotes',
    'upcoming',
    'gardenAudio',
    'seasonal',
    'dailyPoetry',
    'inspirationalQuote',
    'evidence',
    'chinaAttractions',
    'sportsExercise',
  ],
]

export function getNormalizedCardOrder(customOrder?: string[]): string[] {
  if (!customOrder || !Array.isArray(customOrder)) return [...DEFAULT_CARD_ORDER]

  // If saved order matches legacy default, automatically migrate to new default order
  const isMatching = (target: string[]) =>
    customOrder.length === target.length &&
    customOrder.every((k, i) => k === target[i])

  if (LEGACY_DEFAULT_ORDERS.some(isMatching)) {
    return [...DEFAULT_CARD_ORDER]
  }

  const validSet = new Set(DEFAULT_CARD_ORDER)
  const existing = [...new Set(customOrder.filter(k => validSet.has(k)))]
  const existingSet = new Set(existing)
  const missing = DEFAULT_CARD_ORDER.filter(k => !existingSet.has(k))
  return [...existing, ...missing]
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'auto',
  selectedCity: DEFAULT_CITIES[0], // 默认北京
  modules: {
    weather: true,
    calendar: true,
    upcoming: true,
    gardenAudio: true,
    seasonal: true,
    evidence: true,
    dailyPoetry: true,
    inspirationalQuote: true,
    chinaAttractions: true,
    sportsExercise: true,
    quickNotes: true,
    healthTip: true,
  },
  cardOrder: [...DEFAULT_CARD_ORDER],
  attractionStatus: {},
  customEvents: [
    {
      id: 'mom-birthday',
      title: '妈妈生日',
      date: '10-08',
      isLunar: false,
      type: 'birthday',
      role: '母亲',
      giftAdvice: '提前订购鲜花、保温杯或按摩仪',
    },
    {
      id: 'wedding-anniversary',
      title: '结婚纪念日',
      date: '10-24',
      isLunar: false,
      type: 'anniversary',
      role: '伴侣',
      giftAdvice: '提前安排餐厅或特别旅行计划',
    },
    {
      id: 'car-insurance',
      title: '车辆保险与年检到期',
      date: '11-15',
      isLunar: false,
      type: 'custom',
      giftAdvice: '提前比价续保与检查车况',
    }
  ],
  notificationEnabled: false,
}

export function getPreferencesKey(userId?: string | null): string {
  if (userId) return `daygarden_user_prefs_${userId}`
  return 'daygarden_guest_preferences_v1'
}

export function cleanEventGiftAdvice(ev: LifeEvent): LifeEvent {
  if (!ev.giftAdvice) return ev
  let advice = ev.giftAdvice
    .replace(/\s*·\s*30岁[以之]?[下上]过[阳公农]历/g, '')
    .trim()
  if (!ev.isLunar) {
    advice = advice.replace(/\s*·\s*农历[^\s\)]+生?/g, '').trim()
  }
  if (isRedundantMemo(advice)) {
    return { ...ev, giftAdvice: undefined }
  }
  return { ...ev, giftAdvice: advice }
}

export function loadUserPreferences(userId?: string | null): UserPreferences {
  try {
    const key = getPreferencesKey(userId)
    let raw = localStorage.getItem(key)
    if (!raw && !userId) {
      raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)
    }
    if (!raw) return freshPreferences()
    return normalizePreferences(JSON.parse(raw))
  } catch (e) {
    console.warn('Failed to parse preferences:', e)
    return freshPreferences()
  }
}

function freshPreferences(): UserPreferences {
  const preferences = structuredClone(DEFAULT_PREFERENCES)
  preferences.customEvents = sortEventsByDaysLeft(preferences.customEvents)
  return preferences
}

function normalizePreferences(value: unknown, strict = false, base = freshPreferences()): UserPreferences {
  if (!isRecord(value)) throw new Error('配置必须是一个对象。')
  const prefs: UserPreferences = JSON.parse(JSON.stringify(base))
  if (value.theme !== undefined) {
    if (!['light', 'dark', 'auto'].includes(value.theme as string)) { if (strict) throw new Error('主题选项无效。') }
    else prefs.theme = value.theme as UserPreferences['theme']
  }
  if (value.selectedCity !== undefined) {
    try { prefs.selectedCity = validateCityOption(value.selectedCity) } catch (error) { if (strict) throw error }
  }
  if (value.modules !== undefined) {
    if (!isRecord(value.modules)) { if (strict) throw new Error('模块设置格式无效。') }
    else for (const key of Object.keys(prefs.modules) as (keyof UserPreferences['modules'])[]) {
      const enabled = value.modules[key]
      if (enabled === undefined) continue
      if (typeof enabled !== 'boolean') { if (strict) throw new Error('模块开关必须为布尔值。') }
      else prefs.modules[key] = enabled
    }
  }
  if (value.customEvents !== undefined) {
    if (strict) prefs.customEvents = validateEventList(value.customEvents)
    else if (Array.isArray(value.customEvents)) {
      const events = new Map<string, LifeEvent>()
      for (const item of value.customEvents) {
        try { const event = validateLifeEvent(item); if (!events.has(event.id)) events.set(event.id, event) } catch { /* Invalid local records do not crash the page. */ }
      }
      prefs.customEvents = [...events.values()]
    }
  }
  if (value.cardOrder !== undefined) {
    if (!Array.isArray(value.cardOrder) || !value.cardOrder.every(item => typeof item === 'string')) { if (strict) throw new Error('卡片顺序格式无效。') }
    else prefs.cardOrder = getNormalizedCardOrder(value.cardOrder)
  }
  if (value.notificationEnabled !== undefined) {
    if (typeof value.notificationEnabled !== 'boolean') { if (strict) throw new Error('通知开关必须为布尔值。') }
    else prefs.notificationEnabled = value.notificationEnabled
  }
  if (value.attractionStatus !== undefined) {
    if (!isRecord(value.attractionStatus)) { if (strict) throw new Error('景点状态格式无效。') }
    else {
      prefs.attractionStatus = {}
      for (const [id, status] of Object.entries(value.attractionStatus)) {
        if (!['visited', 'wishlist', 'unvisited'].includes(status as string)) { if (strict) throw new Error('景点状态无效。') }
        else prefs.attractionStatus[id] = status as 'visited' | 'wishlist' | 'unvisited'
      }
    }
  }
  prefs.customEvents = sortEventsByDaysLeft(prefs.customEvents.map(cleanEventGiftAdvice).map(event => ({ ...event, type: isAnniversaryEvent(event) ? 'anniversary' : event.type })))
  return prefs
}

export function importPreferences(value: unknown, base?: UserPreferences): UserPreferences {
  if (!isRecord(value)) throw new Error('备份必须是一个 JSON 对象。')
  if ('version' in value && value.version !== 2) throw new Error('不支持此备份版本。')
  const raw = 'version' in value ? value.preferences : value
  if (!isRecord(raw) || !['theme', 'selectedCity', 'modules', 'customEvents', 'cardOrder', 'notificationEnabled', 'attractionStatus'].some(key => key in raw)) throw new Error('文件不包含花园配置。')
  return normalizePreferences(raw, true, base)
}

export function saveUserPreferences(prefs: UserPreferences, userId?: string | null): boolean {
  return saveLocal(getPreferencesKey(userId), { ...prefs, cardOrder: getNormalizedCardOrder(prefs.cardOrder), customEvents: sortEventsByDaysLeft(prefs.customEvents) })
}

export const DEFAULT_QUICK_NOTES: QuickNote[] = [
  {
    id: 'note-welcome-1',
    content: '心有闲田，日有花开。记下当下的所思所想，留存此刻的心境与灵光。',
    createdAt: new Date().toISOString(),
  },
]

export function getQuickNotesKey(userId?: string | null): string {
  if (userId) return `daygarden_quick_notes_${userId}`
  return NOTES_STORAGE_KEY
}

export function loadQuickNotes(userId?: string | null): QuickNote[] {
  try {
    const key = getQuickNotesKey(userId)
    const raw = localStorage.getItem(key)
    if (!raw) return structuredClone(DEFAULT_QUICK_NOTES)
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(note => isRecord(note) && typeof note.id === 'string' && typeof note.content === 'string' && typeof note.createdAt === 'string' && !Number.isNaN(Date.parse(note.createdAt))) : structuredClone(DEFAULT_QUICK_NOTES)
  } catch (e) {
    console.warn('Failed to load quick notes:', e)
    return structuredClone(DEFAULT_QUICK_NOTES)
  }
}

export function saveQuickNotes(notes: QuickNote[], userId?: string | null): boolean {
  return saveLocal(getQuickNotesKey(userId), notes)
}
