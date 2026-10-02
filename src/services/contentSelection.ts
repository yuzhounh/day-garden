export type ContentKind = 'dailyPoetry' | 'seasonal' | 'evidence' | 'inspirationalQuote' | 'sportsExercise' | 'healthTip'
export interface ContentItem { id?: string; name?: string; months?: number[]; season?: string; [key: string]: unknown }
export const contentConfig = {
  dailyPoetry: { prop: 'poetry', next: 'next-poetry', select: 'select-poetry', salt: 79 },
  seasonal: { prop: 'bloom', next: 'next-bloom', select: 'select-bloom', salt: 11 },
  evidence: { prop: 'guide', next: 'next-guide', select: 'select-guide', salt: 42 },
  inspirationalQuote: { prop: 'quote', next: 'next-quote', select: 'select-quote', salt: 67 },
  sportsExercise: { prop: 'sport', next: 'next-sport', select: 'select-sport', salt: 53 },
  healthTip: { prop: 'tip', next: 'next-tip', select: 'select-tip', salt: 3 },
} as const

export function selectDailyContent(list: ContentItem[], kind: ContentKind, date = new Date()): ContentItem | null {
  const month = date.getMonth() + 1
  const season = month >= 3 && month <= 5 ? '春' : month >= 6 && month <= 8 ? '夏' : month >= 9 && month <= 11 ? '秋' : '冬'
  const eligible = kind === 'seasonal' ? list.filter(item => item.months?.includes(month)) : kind === 'dailyPoetry' ? list.filter(item => item.season === season || item.season === '通') : list
  const pool = eligible.length ? eligible : list
  const hash = date.getFullYear() * 372 + month * 31 + date.getDate() + contentConfig[kind].salt * 97
  return pool.length ? pool[Math.abs(hash % pool.length)]! : null
}
