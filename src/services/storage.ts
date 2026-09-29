import type { UserPreferences, SeasonBloom, EvidenceGuide, CuratedPoetry, HealthTip } from '../types'
import { DEFAULT_CITIES } from './weather'
import rawSeasons from '../data/seasons-bloom.json'
import rawEvidence from '../data/evidence-guide.json'
import rawPoetry from '../data/poetry-curated.json'
import rawHealthTips from '../data/health-tips.json'

const STORAGE_KEY = 'daygarden_user_preferences_v1'
const LEGACY_STORAGE_KEY = 'daybloom_user_preferences_v1'

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'auto',
  selectedCity: DEFAULT_CITIES[4], // 默认杭州（或可根据需要切换）
  modules: {
    weather: true,
    upcoming: true,
    seasonal: true,
    evidence: true,
    dailyPoetry: true,
    healthTip: true,
  },
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

export function loadUserPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PREFERENCES }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_PREFERENCES,
      ...parsed,
      modules: { ...DEFAULT_PREFERENCES.modules, ...parsed.modules },
    }
  } catch (e) {
    console.warn('Failed to parse preferences:', e)
    return { ...DEFAULT_PREFERENCES }
  }
}

export function saveUserPreferences(prefs: UserPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
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
  const list = rawPoetry as CuratedPoetry[]
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
