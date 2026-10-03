export interface WeatherDay {
  date: string
  dayOfWeek: string
  isToday: boolean
  isPast: boolean
  weatherCode: number
  weatherText: string
  iconName: string
  tempMax: number
  tempMin: number
  apparentTempMax: number
  apparentTempMin: number
  precipProb: number
  uvIndex?: number
  dataSource?: 'live' | 'cached' | 'demo'
}

export interface CityOption {
  name: string
  province: string
  lat: number
  lon: number
}

export interface LifeEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD or MM-DD (目标/截止日期)
  startDate?: string // 可选创建/起始日期 YYYY-MM-DD or MM-DD
  isLunar?: boolean
  type: 'birthday' | 'anniversary' | 'holiday' | 'custom' | 'schedule'
  role?: string // e.g. "妈妈", "伴侣"
  giftAdvice?: string
  daysLeft?: number
  nextDateStr?: string
  urgencyLevel?: 'today' | 'near' | 'advance' | 'normal'
}

export interface SeasonBloom {
  months: number[]
  solarTerms: string[]
  name: string
  icon: string
  status: string
  description: string
  bestSpot: string
  observation: string
  color: string
}

export interface EvidenceGuide {
  id: string
  title: string
  category: string
  coreAction: string
  roi: string
  source: string
  details: string
  sourceUrl: string
}

export interface CuratedPoetry {
  id: string
  title: string
  author: string
  dynasty: string
  quote: string
  content: string
  season?: string
  mood?: string
  reading?: string
}

export interface HealthTip {
  id: string
  tag: string
  tip: string
  source: string
  sourceUrl: string
}

export interface InspirationalQuote {
  id: string
  quote: string
  author: string
  source?: string
  tag: string
  insight: string
}

export interface ChinaAttraction {
  id: string
  name: string
  province: string
  city: string
  category: 'natural' | 'cultural' | 'historical'
  level: string
  highlight: string
  bestSeason: string
  quote: string
}

export type AttractionStatusType = 'visited' | 'wishlist' | 'unvisited'

export interface SportExercise {
  id: string
  name: string
  category: string
  intensity: '低强度' | '中等强度' | '高强度'
  caloriesPerHour: number
  benefits: string[]
  targetMuscles: string[]
  evidenceInsight: string
  tips: string
}

export interface QuickNote {
  id: string
  content: string
  tag?: string
  createdAt: string
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  selectedCity: CityOption
  modules: {
    weather: boolean
    calendar?: boolean
    upcoming: boolean
    seasonal: boolean
    evidence: boolean
    dailyPoetry: boolean
    inspirationalQuote?: boolean
    chinaAttractions?: boolean
    sportsExercise?: boolean
    quickNotes?: boolean
    gardenAudio?: boolean
    healthTip: boolean
  }
  cardOrder?: string[]
  customEvents: LifeEvent[]
  attractionStatus?: Record<string, AttractionStatusType>
  notificationEnabled: boolean
}

export interface User {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  providers?: string[]
}

export interface AuthProvidersConfig {
  google: boolean
  github: boolean
}

