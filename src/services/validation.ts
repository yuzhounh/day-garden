import type { LifeEvent, CityOption } from '../types'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function validateCityOption(value: unknown): CityOption {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim() || value.name.trim().length > 100 || typeof value.province !== 'string' || value.province.length > 100 || typeof value.lat !== 'number' || typeof value.lon !== 'number' || !Number.isFinite(value.lat) || !Number.isFinite(value.lon) || Math.abs(value.lat) > 90 || Math.abs(value.lon) > 180) {
    throw new Error('城市名称、省份或经纬度无效。')
  }
  return { name: value.name.trim(), province: value.province.trim(), lat: value.lat, lon: value.lon }
}

export function parseEventDate(value: unknown, isLunar = false) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/[/. 年月]+/g, '-').replace(/日$/, '')
  const match = normalized.match(/^(?:(\d{4})-)?(\d{1,2})-(\d{1,2})$/)
  if (!match) return null
  const year = match[1] ? Number(match[1]) : undefined
  const month = Number(match[2])
  const day = Number(match[3])
  if ((year !== undefined && (year < 1901 || year > 2199)) || month < 1 || month > 12 || day < 1) return null
  if (isLunar) {
    if (day > 30) return null
  } else {
    const date = new Date(Date.UTC(year ?? 2000, month - 1, day))
    if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  }
  const date = `${year === undefined ? '' : year + '-'}${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return { year, month, day, date }
}

export function validateLifeEvent(value: unknown): LifeEvent {
  if (!isRecord(value)) throw new Error('日程必须是一个对象。')
  if (typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(value.id)) throw new Error('日程编号无效。')
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.trim().length > 64) throw new Error('日程标题须为 1—64 个字符。')
  if (value.isLunar !== undefined && typeof value.isLunar !== 'boolean') throw new Error('农历选项必须是布尔值。')
  const parsed = parseEventDate(value.date, value.isLunar === true)
  if (!parsed) throw new Error('日期无效，请填写有效的 YYYY-MM-DD 或 MM-DD 日期。农历日期最多为三十日。')
  let startDate: string | undefined
  if (value.startDate !== undefined && value.startDate !== null && value.startDate !== '') {
    const parsedStart = parseEventDate(value.startDate, value.isLunar === true)
    if (!parsedStart) throw new Error('创建/起始日期无效，请填写有效的 YYYY-MM-DD 或 MM-DD 日期。')
    startDate = parsedStart.date
  }
  const type = value.type ?? 'birthday'
  if (!['birthday', 'anniversary', 'custom', 'schedule'].includes(type as string)) throw new Error('日程类型无效。')
  for (const [key, limit] of [['role', 32], ['giftAdvice', 128]] as const) {
    if (value[key] !== undefined && (typeof value[key] !== 'string' || value[key].length > limit)) throw new Error(`${key === 'role' ? '关系' : '备注'}格式或长度无效。`)
  }
  return { id: value.id, title: value.title.trim(), date: parsed.date, startDate, isLunar: value.isLunar === true, type: type as LifeEvent['type'], role: (value.role as string | undefined)?.trim() || undefined, giftAdvice: (value.giftAdvice as string | undefined)?.trim() || undefined }
}

export function validateEventList(value: unknown): LifeEvent[] {
  if (!Array.isArray(value) || value.length > 300) throw new Error('日程必须是数组，且最多包含 300 项。')
  const events = value.map(validateLifeEvent)
  if (new Set(events.map(event => event.id)).size !== events.length) throw new Error('日程编号不能重复。')
  return events
}
