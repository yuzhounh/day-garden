import { reactive, ref } from 'vue'
import { localDateKey } from './day'
import poems from '../data/poetry-curated.json'

interface User { id: string; username: string }
interface Mutation { id: string; path: string; method: 'PUT' | 'DELETE' }
interface GardenData { savedPoetry: string[]; dailyActions: Record<string, string[]>; pending: Mutation[] }
const validPoems = new Set(poems.map(poem => poem.id))
const validActions = new Set(['move', 'eyes', 'sleep'])
function read(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } }
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* In-memory state remains usable. */ } }
function parseData(raw: unknown): GardenData {
  const data = raw as Partial<GardenData> | null
  const savedPoetry = Array.isArray(data?.savedPoetry) ? data.savedPoetry.filter(id => validPoems.has(id)) : []
  const dailyActions: Record<string, string[]> = {}
  if (data?.dailyActions && typeof data.dailyActions === 'object') {
    for (const [date, ids] of Object.entries(data.dailyActions)) if (/^20\d{2}-\d{2}-\d{2}$/.test(date) && Array.isArray(ids)) dailyActions[date] = [...new Set(ids.filter(id => validActions.has(id)))]
  }
  const pending = Array.isArray(data?.pending) ? data.pending.filter(item => item && typeof item.id === 'string' && typeof item.path === 'string' && /^\/api\/(poetry|habits)\//.test(item.path) && ['PUT', 'DELETE'].includes(item.method)) : []
  return { savedPoetry: [...new Set(savedPoetry)], dailyActions, pending }
}
function guestData(): GardenData {
  const saved = read('daygarden_guest_data')
  if (saved) return parseData(saved)
  const legacy = read('daygarden_daily_actions') as { date?: string; ids?: string[] } | null
  return parseData({ savedPoetry: read('daygarden_saved_poetry'), dailyActions: legacy?.date ? { [legacy.date]: legacy.ids } : {} })
}
const previous = read('daygarden_last_user') as User | null
export const account = reactive({ user: previous?.id && previous?.username ? previous : null as User | null, busy: false, available: false, status: 'local' as 'local' | 'syncing' | 'synced' | 'offline', error: '' })
const initial = account.user ? parseData(read('daygarden_account_' + account.user.id)) : guestData()
export const savedPoetryIds = ref(initial.savedPoetry)
export const dailyActions = ref(initial.dailyActions)
let pending = initial.pending
let revision = 0
let flushing: Promise<void> | null = null
function persist() {
  write(account.user ? 'daygarden_account_' + account.user.id : 'daygarden_guest_data', { savedPoetry: savedPoetryIds.value, dailyActions: dailyActions.value, pending })
  write('daygarden_last_user', account.user)
}
function activate(user: User | null) {
  account.user = user
  const data = user ? parseData(read('daygarden_account_' + user.id)) : guestData()
  savedPoetryIds.value = data.savedPoetry
  dailyActions.value = data.dailyActions
  pending = data.pending
  revision++
  persist()
}
class SyncError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}
async function api<T>(path: string, method = 'GET', value?: unknown): Promise<T> {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: value === undefined ? undefined : { 'Content-Type': 'application/json' }, body: value === undefined ? undefined : JSON.stringify(value), signal: AbortSignal.timeout(10000) })
  if (!response.headers.get('Content-Type')?.includes('application/json')) throw new SyncError('云端服务尚未连接，本地保存仍可使用。', 503)
  const data = await response.json()
  if (!response.ok) throw new SyncError(data.error || '同步暂时不可用。', response.status)
  return data as T
}
function queue(path: string, enabled: boolean) {
  if (account.user) {
    pending = pending.filter(item => item.path !== path)
    pending.push({ id: crypto.randomUUID(), path, method: enabled ? 'PUT' : 'DELETE' })
  }
  revision++
  persist()
  if (account.user) void flush()
}
export function togglePoetry(id: string) {
  if (!validPoems.has(id)) return
  const enabled = !savedPoetryIds.value.includes(id)
  savedPoetryIds.value = enabled ? [...savedPoetryIds.value, id] : savedPoetryIds.value.filter(value => value !== id)
  queue('/api/poetry/' + id, enabled)
}
export function toggleHabit(date: string, id: string) {
  if (!validActions.has(id)) return
  const ids = dailyActions.value[date] || []
  const enabled = !ids.includes(id)
  dailyActions.value = { ...dailyActions.value, [date]: enabled ? [...ids, id] : ids.filter(value => value !== id) }
  queue('/api/habits/' + date + '/' + id, enabled)
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
        await api(item.path, item.method)
        if (account.user?.id !== userId) return
        pending = pending.filter(next => next.id !== item.id)
        persist()
      }
      if (account.user?.id === userId) { account.status = 'synced'; account.error = '' }
    } catch (error) {
      if (account.user?.id !== userId) return
      account.status = 'offline'
      account.error = error instanceof SyncError && error.status === 401 ? '登录已过期，请重新登录。操作已保存在本机。' : '操作已保存在本机，联网后可重试同步。'
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
    const data = await api<GardenData>('/api/state')
    if (account.user?.id !== userId || revision !== currentRevision || pending.length) return
    const parsed = parseData(data)
    savedPoetryIds.value = parsed.savedPoetry
    dailyActions.value = parsed.dailyActions
    account.status = 'synced'
    account.error = ''
    persist()
  } catch {
    if (account.user?.id !== userId) return
    account.status = 'offline'
    account.error = '暂时无法读取云端，当前内容仍保存在本机。'
  }
}
export async function initializeSync() {
  try {
    const data = await api<{ user: User | null }>('/api/session')
    account.available = true
    activate(data.user)
    if (data.user) await refreshCloud()
    else account.status = 'local'
  } catch { account.status = account.user ? 'offline' : 'local' }
}
export async function signIn(username: string, password: string, register: boolean, mergeGuest: boolean) {
  account.busy = true
  account.error = ''
  try {
    await flushing
    const data = await api<{ user: User }>(register ? '/api/register' : '/api/login', 'POST', { username, password })
    activate(data.user)
    account.available = true
    if (mergeGuest) {
      const guest = guestData()
      for (const id of guest.savedPoetry) if (!savedPoetryIds.value.includes(id)) { savedPoetryIds.value.push(id); queue('/api/poetry/' + id, true) }
      for (const [date, ids] of Object.entries(guest.dailyActions)) {
        for (const id of ids) if (!(dailyActions.value[date] || []).includes(id)) {
          dailyActions.value[date] = [...(dailyActions.value[date] || []), id]
          queue('/api/habits/' + date + '/' + id, true)
        }
      }
    }
    await refreshCloud()
  } catch (error) {
    account.error = error instanceof Error ? error.message : '登录暂时不可用。'
    throw error
  } finally { account.busy = false }
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
  const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), savedPoetry: savedPoetryIds.value, dailyActions: dailyActions.value }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = 'day-garden-collection-' + localDateKey() + '.json'; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
