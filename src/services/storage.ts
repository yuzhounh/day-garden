import type { UserPreferences, SeasonBloom, EvidenceGuide, CuratedPoetry, HealthTip, InspirationalQuote } from '../types'
import { DEFAULT_CITIES } from './weather'
import rawSeasons from '../data/seasons-bloom.json'
import rawEvidence from '../data/evidence-guide.json'
import rawPoetry from '../data/poetry-curated.json'
import rawHealthTips from '../data/health-tips.json'
import rawQuotes from '../data/inspirational-quotes.json'

const STORAGE_KEY = 'daygarden_user_preferences_v1'
const LEGACY_STORAGE_KEY = 'daybloom_user_preferences_v1'

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'auto',
  selectedCity: DEFAULT_CITIES[4], // 默认杭州（或可根据需要切换）
  modules: {
    weather: true,
    calendar: true,
    upcoming: true,
    seasonal: true,
    evidence: true,
    dailyPoetry: true,
    inspirationalQuote: true,
    chinaAttractions: true,
    healthTip: true,
  },
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

export function loadUserPreferences(userId?: string | null): UserPreferences {
  try {
    const key = getPreferencesKey(userId)
    let raw = localStorage.getItem(key)
    if (!raw && !userId) {
      raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)
    }
    if (!raw) return { ...DEFAULT_PREFERENCES, customEvents: [...DEFAULT_PREFERENCES.customEvents] }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      modules: { ...DEFAULT_PREFERENCES.modules, ...parsed.modules },
      customEvents: Array.isArray(parsed.customEvents) ? parsed.customEvents : [...DEFAULT_PREFERENCES.customEvents],
    }
  } catch (e) {
    console.warn('Failed to parse preferences:', e)
    return { ...DEFAULT_PREFERENCES, customEvents: [...DEFAULT_PREFERENCES.customEvents] }
  }
}

export function saveUserPreferences(prefs: UserPreferences, userId?: string | null) {
  try {
    const key = getPreferencesKey(userId)
    localStorage.setItem(key, JSON.stringify(prefs))
  } catch (e) {
    console.error('Failed to save preferences:', e)
  }
}

/**
 * 基于当前日期的伪随机哈希，确保一天之内每次打开显示同一条内容，避免频繁刷新跳变
 */
export function getDailyIndex(length: number, offsetSalt: number = 0, date: Date = new Date()): number {
  if (length <= 0) return 0
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  // 简易稳定整数哈希
  const hash = (y * 372 + m * 31 + d + offsetSalt * 97) % length
  return Math.abs(hash)
}

/**
 * 获取今日四时花期
 */
export function getTodaySeasonBloom(date: Date = new Date()): SeasonBloom {
  const currentMonth = date.getMonth() + 1
  const list = (rawSeasons as SeasonBloom[]).filter((item) => item.months.includes(currentMonth))
  if (list.length === 0) return rawSeasons[0] as SeasonBloom
  const idx = getDailyIndex(list.length, 11, date)
  return list[idx]
}

/**
 * 获取今日循证生活指南
 */
export function getTodayEvidenceGuide(date: Date = new Date()): EvidenceGuide {
  const list = rawEvidence as EvidenceGuide[]
  const idx = getDailyIndex(list.length, 42, date)
  return list[idx]
}

/**
 * 获取今日诗词名篇
 */
export function getTodayPoetry(date: Date = new Date()): CuratedPoetry {
  const month = date.getMonth() + 1
  const season = month >= 3 && month <= 5 ? '春' : month >= 6 && month <= 8 ? '夏' : month >= 9 && month <= 11 ? '秋' : '冬'
  // 兼顾当季时令诗词与豁达通感名篇，增加每日阅读惊喜与深度
  const eligible = (rawPoetry as CuratedPoetry[]).filter(poem => poem.season === season || poem.season === '通')
  const list = eligible.length ? eligible : rawPoetry as CuratedPoetry[]
  const idx = getDailyIndex(list.length, 79, date)
  return list[idx]
}

/**
 * 获取今日健康微提醒
 */
export function getTodayHealthTip(date: Date = new Date()): HealthTip {
  const list = rawHealthTips as HealthTip[]
  const idx = getDailyIndex(list.length, 3, date)
  return list[idx]
}

/**
 * 获取今日名人励志名言
 */
export function getTodayQuote(date: Date = new Date()): InspirationalQuote {
  const list = rawQuotes as InspirationalQuote[]
  const idx = getDailyIndex(list.length, 67, date)
  return list[idx]
}
