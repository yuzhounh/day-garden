import { reactive, ref } from 'vue'
import type { User, LifeEvent, CityOption } from '../types'
import { localDateKey } from './day'
import { loadUserPreferences, saveUserPreferences, cleanEventGiftAdvice, getPreferencesKey, DEFAULT_PREFERENCES } from './storage'
import poemIds from '../data/poetry-ids.json'
import { isRecord, validateEventList, validateLifeEvent, validateCityOption } from './validation'
import { saveLocal } from './persistence'

interface Mutation { id: string; path: string; method: 'PUT' | 'DELETE'; value?: LifeEvent | CityOption }
interface GardenData { savedPoetry: string[]; dailyActions: Record<string, string[]>; pending: Mutation[]; eventsInitialized: boolean }

const validPoems = new Set(poemIds)
const validActions = new Set(['move', 'eyes', 'sleep'])

function read(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function write(key: string, value: unknown) {
  return saveLocal(key, value)
}

function parseData(raw: unknown): GardenData {
  const data = raw as Partial<GardenData> | null
  const savedPoetry = Array.isArray(data?.savedPoetry) ? data.savedPoetry.filter(id => validPoems.has(id)) : []
  const dailyActions: Record<string, string[]> = {}
  if (data?.dailyActions && typeof data.dailyActions === 'object') {
    for (const [date, ids] of Object.entries(data.dailyActions)) {
      if (/^20\d{2}-\d{2}-\d{2}$/.test(date) && Array.isArray(ids)) {
        dailyActions[date] = [...new Set(ids.filter(id => validActions.has(id)))]
      }
    }
  }
  const pending = Array.isArray(data?.pending)
    ? data.pending.filter(item => {
      if (!item || typeof item.id !== 'string' || typeof item.path !== 'string' || (!/^\/api\/(poetry|habits|events)\//.test(item.path) && item.path !== '/api/city') || !['PUT', 'DELETE'].includes(item.method)) return false
      if (item.path === '/api/city') {
        try { item.value = validateCityOption(item.value); return item.method === 'PUT' } catch { return false }
      }
      if (item.path.startsWith('/api/events/') && item.method === 'PUT') {
        try { item.value = validateLifeEvent(item.value); return item.path === '/api/events/' + item.value.id } catch { return false }
      }
      return true
    })
    : []
  return { savedPoetry: [...new Set(savedPoetry)], dailyActions, pending, eventsInitialized: data?.eventsInitialized === true }
}

function guestData(): GardenData {
  const saved = read('daygarden_guest_data')
  if (saved) return parseData(saved)
  const legacy = read('daygarden_daily_actions') as { date?: string; ids?: string[] } | null
  return parseData({ savedPoetry: read('daygarden_saved_poetry'), dailyActions: legacy?.date ? { [legacy.date]: legacy.ids } : {} })
}

const previous = read('daygarden_last_user') as User | null
export const account = reactive({
  user: previous?.id && previous?.username ? previous : null as User | null,
  busy: false,
  available: false,
  status: 'local' as 'local' | 'syncing' | 'synced' | 'offline',
  error: '',
})

export const authProviders = reactive({
  google: false,
  github: false,
  dev: false,
  loaded: false,
})

const initial = account.user ? parseData(read('daygarden_account_' + account.user.id)) : guestData()
export const savedPoetryIds = ref(initial.savedPoetry)
export const dailyActions = ref(initial.dailyActions)
function readLegacyEvents(userId?: string): LifeEvent[] {
  if (!userId) return []
  try { return validateEventList(read('daygarden_legacy_events_' + userId)) } catch { return [] }
}
export const legacyCustomEvents = ref(readLegacyEvents(account.user?.id))
let pending = initial.pending
let eventsInitialized = initial.eventsInitialized
let revision = 0
let flushing: Promise<void> | null = null

function persist() {
  const dataSaved = write(account.user ? 'daygarden_account_' + account.user.id : 'daygarden_guest_data', { savedPoetry: savedPoetryIds.value, dailyActions: dailyActions.value, pending, eventsInitialized })
  const userSaved = write('daygarden_last_user', account.user)
  return dataSaved && userSaved
}

function activate(user: User | null) {
  if (user && !account.user) {
    const cached = read(getPreferencesKey(user.id))
    if (!isRecord(cached) || cached.selectedCity === undefined) {
      const prefs = loadUserPreferences(user.id)
      prefs.selectedCity = loadUserPreferences().selectedCity
      saveUserPreferences(prefs, user.id)
    }
  }
  account.user = user
  const data = user ? parseData(read('daygarden_account_' + user.id)) : guestData()
  savedPoetryIds.value = data.savedPoetry
  dailyActions.value = data.dailyActions
  pending = data.pending
  eventsInitialized = data.eventsInitialized
  legacyCustomEvents.value = readLegacyEvents(user?.id)
  revision++
  persist()
}

class SyncError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

async function api<T>(path: string, method = 'GET', value?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: value === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: value === undefined ? undefined : JSON.stringify(value),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    throw new SyncError('云端服务尚未连接，本地保存仍可使用。', 503)
  }
  const data = await response.json()
  if (!response.ok) throw new SyncError(data.error || '同步暂时不可用。', response.status)
  return data as T
}

function enqueue(path: string, method: Mutation['method'], value?: Mutation['value']) {
  pending = pending.filter(item => item.path !== path)
  pending.push({ id: crypto.randomUUID(), path, method, value })
}

function queue(path: string, enabled: boolean) {
  if (account.user) {
    enqueue(path, enabled ? 'PUT' : 'DELETE')
  }
  revision++
  persist()
  if (account.user) void flush()
}

export function togglePoetry(id: string) {
  if (!validPoems.has(id) || !account.user) return false
  const enabled = !savedPoetryIds.value.includes(id)
  savedPoetryIds.value = enabled ? [...savedPoetryIds.value, id] : savedPoetryIds.value.filter(value => value !== id)
  queue('/api/poetry/' + id, enabled)
  return true
}

export function toggleHabit(date: string, id: string) {
  if (!validActions.has(id)) return
  const ids = dailyActions.value[date] || []
  const enabled = !ids.includes(id)
  dailyActions.value = { ...dailyActions.value, [date]: enabled ? [...ids, id] : ids.filter(value => value !== id) }
  queue('/api/habits/' + date + '/' + id, enabled)
}

export async function syncSelectedCity(city: CityOption) {
  if (!account.user) return
  const selectedCity = validateCityOption(city)
  const prefs = loadUserPreferences(account.user.id)
  prefs.selectedCity = selectedCity
  saveUserPreferences(prefs, account.user.id)
  enqueue('/api/city', 'PUT', selectedCity)
  revision++
  persist()
  await flush()
}

async function flush(): Promise<void> {
  if (flushing) return flushing
  if (!account.user || !pending.length) return
  const userId = account.user.id
  flushing = (async () => {
    account.status = 'syncing'
    try {
      while (pending.length && account.user?.id === userId) {
        const item = pending[0]!
        await api(item.path, item.method, item.value)
        if (account.user?.id !== userId) return
        pending = pending.filter(next => next.id !== item.id)
        persist()
      }
      if (account.user?.id === userId) { account.status = 'synced'; account.error = '' }
    } catch (error) {
      if (account.user?.id !== userId) return
      account.status = 'offline'
      account.error = !persist() ? '操作暂留在当前页面，本机存储不可写。请保持页面打开，联网同步或导出备份。' : error instanceof SyncError && error.status === 401 ? '登录已过期，请重新登录。操作已保存在本机。' : '操作已保存在本机，联网后可重试同步。'
    } finally { flushing = null }
  })()
  return flushing
}

export async function refreshCloud() {
  if (!account.user) return
  await flush()
  if (pending.length || !account.user) return
  const userId = account.user.id
  const currentRevision = revision
  try {
    const data = await api<GardenData & { customEvents?: LifeEvent[]; selectedCity?: CityOption | null }>('/api/state')
    if (account.user?.id !== userId || revision !== currentRevision || pending.length) return
    const parsed = parseData(data)
    savedPoetryIds.value = parsed.savedPoetry
    dailyActions.value = parsed.dailyActions
    account.status = 'synced'
    account.error = ''
    persist()

    if (Array.isArray(data.customEvents)) {
      const userPrefs = loadUserPreferences(userId)
      const cleanedEvents = validateEventList(data.customEvents).map(cleanEventGiftAdvice)
      if (!eventsInitialized) {
        const stored = read(getPreferencesKey(userId))
        const cloud = new Map(cleanedEvents.map(event => [event.id, JSON.stringify(validateLifeEvent(event))]))
        const legacyEvents = stored ? userPrefs.customEvents.filter(event => !isExampleEvent(event) && JSON.stringify(validateLifeEvent(event)) !== cloud.get(event.id)) : []
        if (legacyEvents.length && !legacyCustomEvents.value.length) legacyCustomEvents.value = legacyEvents
        if (legacyCustomEvents.value.length && !write('daygarden_legacy_events_' + userId, legacyCustomEvents.value)) {
          window.dispatchEvent(new CustomEvent('daygarden:prefs-synced', { detail: { userId, customEvents: cleanedEvents } }))
          return
        }
        eventsInitialized = true
        persist()
      }
      userPrefs.customEvents = cleanedEvents
      saveUserPreferences(userPrefs, userId)
      window.dispatchEvent(new CustomEvent('daygarden:prefs-synced', { detail: { userId, customEvents: cleanedEvents } }))
    }
    if (data.selectedCity !== undefined) {
      const prefs = loadUserPreferences(userId)
      if (data.selectedCity === null) {
        await syncSelectedCity(prefs.selectedCity)
      } else {
        prefs.selectedCity = validateCityOption(data.selectedCity)
        saveUserPreferences(prefs, userId)
        window.dispatchEvent(new CustomEvent('daygarden:city-synced', { detail: { userId, selectedCity: prefs.selectedCity } }))
      }
    }
  } catch {
    if (account.user?.id !== userId) return
    account.status = 'offline'
    account.error = '暂时无法读取云端，当前内容仍保存在本机。'
  }
}

function isExampleEvent(event: LifeEvent): boolean {
  return DEFAULT_PREFERENCES.customEvents.some(example => example.id === event.id && example.title === event.title && example.date === event.date && example.giftAdvice === event.giftAdvice)
}

export async function recoverLegacyEvents() {
  if (!account.user || account.busy) return
  const userId = account.user.id
  account.busy = true
  try {
    await refreshCloud()
    if (account.user?.id !== userId || account.status !== 'synced') throw new Error('请先联网完成同步，再合并旧本机日程。备份仍保留在本机。')
    const prefs = loadUserPreferences(userId)
    const previousEvents = prefs.customEvents
    const merged = new Map(previousEvents.map(event => [event.id, event]))
    for (const event of legacyCustomEvents.value) if (!merged.has(event.id)) merged.set(event.id, event)
    prefs.customEvents = [...merged.values()]
    if (!saveUserPreferences(prefs, userId)) throw new Error('本机存储不可写，请先导出旧日程备份，再恢复存储权限。')
    window.dispatchEvent(new CustomEvent('daygarden:prefs-synced', { detail: { userId, customEvents: prefs.customEvents } }))
    await syncCustomEvents(prefs.customEvents, previousEvents)
    if (account.user?.id === userId && account.status === 'synced') {
      if (write('daygarden_legacy_events_' + userId, [])) legacyCustomEvents.value = []
    }
  } catch (error) { account.error = error instanceof Error ? error.message : '日程合并未完成，请稍后重试。' }
  finally { account.busy = false }
}

export async function syncCustomEvents(events: LifeEvent[], previousEvents: LifeEvent[]): Promise<void> {
  if (!account.user) return
  const next = validateEventList(events)
  const previous = new Map(validateEventList(previousEvents).map(event => [event.id, event]))
  for (const event of next) {
    if (JSON.stringify(event) !== JSON.stringify(previous.get(event.id))) enqueue('/api/events/' + event.id, 'PUT', event)
    previous.delete(event.id)
  }
  for (const id of previous.keys()) enqueue('/api/events/' + id, 'DELETE')
  if (!pending.length) return
  eventsInitialized = true
  revision++
  persist()
  await flush()
}

export function mergeGuestIntoAccount() {
  const guest = guestData()
  for (const id of guest.savedPoetry) {
    if (!savedPoetryIds.value.includes(id)) {
      savedPoetryIds.value.push(id)
      queue('/api/poetry/' + id, true)
    }
  }
  for (const [date, ids] of Object.entries(guest.dailyActions)) {
    for (const id of ids) {
      if (!(dailyActions.value[date] || []).includes(id)) {
        dailyActions.value[date] = [...(dailyActions.value[date] || []), id]
        queue('/api/habits/' + date + '/' + id, true)
      }
    }
  }
  const guestEvents = loadUserPreferences().customEvents.filter(event => !isExampleEvent(event))
  if (guestEvents.length && account.user) {
    const prefs = loadUserPreferences(account.user.id)
    const previousEvents = prefs.customEvents.filter(event => !isExampleEvent(event))
    const merged = new Map(previousEvents.map(event => [event.id, event]))
    for (const event of guestEvents) if (!merged.has(event.id)) merged.set(event.id, event)
    prefs.customEvents = [...merged.values()]
    saveUserPreferences(prefs, account.user.id)
    window.dispatchEvent(new CustomEvent('daygarden:prefs-synced', { detail: { userId: account.user.id, customEvents: prefs.customEvents } }))
    void syncCustomEvents(prefs.customEvents, previousEvents)
  }
}

export async function fetchAuthProviders() {
  try {
    const data = await api<{ google: boolean; github: boolean; dev: boolean }>('/api/auth/providers')
    authProviders.google = Boolean(data.google)
    authProviders.github = Boolean(data.github)
    authProviders.dev = Boolean(data.dev)
    authProviders.loaded = true
  } catch {
    authProviders.loaded = true
  }
}

export async function initializeSync() {
  void fetchAuthProviders()
  try {
    const data = await api<{ user: User | null }>('/api/session')
    account.available = true
    activate(data.user)
    const returnUrl = new URL(window.location.href)
    if (returnUrl.searchParams.has('oauth')) {
      let stored: unknown = null
      try { stored = JSON.parse(sessionStorage.getItem('daygarden_oauth_attempt') || 'null'); sessionStorage.removeItem('daygarden_oauth_attempt') } catch {}
      if (isRecord(stored) && stored.attempt === returnUrl.searchParams.get('attempt')) {
        if (returnUrl.searchParams.get('oauth') === 'success' && data.user && (stored.userId === undefined || stored.userId === data.user.id)) {
          if (stored.mergeGuest === true && stored.link !== true) mergeGuestIntoAccount()
        } else account.error = '第三方授权未完成，请重新登录。'
      }
      returnUrl.searchParams.delete('oauth'); returnUrl.searchParams.delete('attempt')
      window.history.replaceState(null, '', returnUrl.pathname + returnUrl.search + returnUrl.hash)
    }
    if (data.user) await refreshCloud()
    else account.status = 'local'
  } catch {
    account.status = account.user ? 'offline' : 'local'
  }
}

export async function signIn(username: string, password: string, register: boolean, mergeGuest: boolean) {
  account.busy = true
  account.error = ''
  try {
    await flushing
    const data = await api<{ user: User }>(register ? '/api/register' : '/api/login', 'POST', { username, password })
    activate(data.user)
    account.available = true
    if (mergeGuest) mergeGuestIntoAccount()
    await refreshCloud()
  } catch (error) {
    account.error = error instanceof Error ? error.message : '登录暂时不可用。'
    throw error
  } finally { account.busy = false }
}

interface OAuthAttempt { provider: 'google' | 'github'; id: string; popup: Window; mergeGuest: boolean; userId?: string; startedAt: number }
let oauthAttempt: OAuthAttempt | null = null
let oauthTimer: number | undefined

function finishOAuth() {
  window.clearInterval(oauthTimer)
  oauthTimer = undefined
  oauthAttempt = null
}

export function loginWithOAuth(provider: 'google' | 'github', mergeGuest = true, link = false) {
  if (account.busy) return
  account.busy = true
  account.error = ''
  const attempt = crypto.randomUUID()
  try {
    sessionStorage.setItem('daygarden_oauth_attempt', JSON.stringify({ provider, attempt, mergeGuest, link, userId: link ? account.user?.id : undefined }))
  } catch {}

  const width = 520
  const height = 660
  const left = typeof window !== 'undefined' ? window.screenX + (window.outerWidth - width) / 2 : 100
  const top = typeof window !== 'undefined' ? window.screenY + (window.outerHeight - height) / 2 : 100
  const url = `/api/auth/${provider}?${new URLSearchParams({ return_origin: window.location.origin, attempt, mode: link ? 'link' : 'login' })}`

  const popup = typeof window !== 'undefined'
    ? window.open(url, `daygarden_oauth_${provider}`, `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,status=no`)
    : null

  if (!popup || popup.closed) {
    window.location.href = url
    return
  }
  oauthAttempt = { provider, id: attempt, popup, mergeGuest: !link && mergeGuest, userId: link ? account.user?.id : undefined, startedAt: Date.now() }
  oauthTimer = window.setInterval(() => {
    if (!oauthAttempt) return
    if (popup.closed || Date.now() - oauthAttempt.startedAt >= 600000) {
      const timedOut = !popup.closed
      if (timedOut) popup.close()
      finishOAuth()
      account.busy = false
      account.error = timedOut ? '授权等待已超时，请重新登录。' : '授权窗口已关闭，你可以重新登录。'
      try { sessionStorage.removeItem('daygarden_oauth_attempt') } catch {}
    }
  }, 500)
}

export async function loginWithMock(provider: 'google' | 'github', mergeGuest = true, link = false) {
  account.busy = true
  account.error = ''
  try {
    await flushing
    await api('/api/auth/mock', 'POST', { provider, link })
    const sessionRes = await api<{ user: User | null }>('/api/session')
    if (sessionRes.user) {
      activate(sessionRes.user)
      account.available = true
      if (!link && mergeGuest) mergeGuestIntoAccount()
      await refreshCloud()
    }
  } catch (error) {
    account.error = error instanceof Error ? error.message : '模拟登录失败。'
  } finally {
    account.busy = false
  }
}

export async function unlinkProvider(provider: 'google' | 'github') {
  account.busy = true
  account.error = ''
  try {
    const data = await api<{ ok: boolean; user: User }>('/api/auth/unlink', 'POST', { provider })
    account.user = data.user
    persist()
  } catch (error) {
    account.error = error instanceof Error ? error.message : '解绑失败。'
    throw error
  } finally {
    account.busy = false
  }
}

export async function signOut() {
  account.busy = true
  try {
    await flushing
    await api('/api/logout', 'POST')
    activate(null)
    account.status = 'local'
    account.error = ''
  } catch { account.error = '退出暂时未成功，请联网后重试。' }
  finally { account.busy = false }
}

export function exportGardenData() {
  const blob = new Blob([JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), savedPoetry: savedPoetryIds.value, dailyActions: dailyActions.value, customEvents: loadUserPreferences(account.user?.id).customEvents, legacyCustomEvents: legacyCustomEvents.value, pending }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = 'day-garden-collection-' + localDateKey() + '.json'; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function handleOAuthMessage(event: MessageEvent) {
  const attempt = oauthAttempt
  if (!attempt || event.origin !== window.location.origin || event.source !== attempt.popup || !isRecord(event.data) || event.data.provider !== attempt.provider || event.data.attempt !== attempt.id) return
  if (!['daygarden-oauth-success', 'daygarden-oauth-error'].includes(event.data.type as string)) return
  finishOAuth()
  try { sessionStorage.removeItem('daygarden_oauth_attempt') } catch {}
  if (event.data.type === 'daygarden-oauth-error') {
    account.error = typeof event.data.message === 'string' ? event.data.message.slice(0, 500) : '第三方授权登录未完成。'
    account.busy = false
    return
  }
  try {
    await flushing
    const res = await api<{ user: User | null }>('/api/session')
    if (!res.user || (attempt.userId && res.user.id !== attempt.userId)) throw new Error('账户关联未完成，请重新登录后再试。')
    activate(res.user)
    account.available = true
    if (attempt.mergeGuest) mergeGuestIntoAccount()
    await refreshCloud()
  } catch (error) {
    account.error = error instanceof Error ? error.message : '同步登录数据异常，请重试。'
  } finally { account.busy = false }
}

if (typeof window !== 'undefined') window.addEventListener('message', event => { void handleOAuthMessage(event) })
