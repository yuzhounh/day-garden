import test from 'node:test'
import assert from 'node:assert/strict'
import { loadApp, memoryStorage, json } from './helpers.mjs'

const user = { id: 'user-a', username: 'account_a' }
const event = (id = 'birthday-a', title = '生日') => ({ id, title, date: '10-08', isLunar: false, type: 'birthday' })
function accountStorage() {
  return memoryStorage(new Map([['daygarden_last_user', JSON.stringify(user)], ['daygarden_account_user-a', JSON.stringify({ eventsInitialized: true })]]))
}

test('Guest favorite attempts never mutate storage; signing in does not save a guest attempt', async () => {
  const guest = JSON.stringify({ savedPoetry: ['meng-chunxiao'], dailyActions: {} })
  const storage = memoryStorage(new Map([['daygarden_guest_data', guest]]))
  let rejectLogin = true
  const app = await loadApp({ storage, fetch: async path => {
    if (path === '/api/login') return rejectLogin ? json({ error: '登录失败' }, 401) : json({ user })
    if (path === '/api/state') return json({ savedPoetry: [], dailyActions: {}, customEvents: [] })
    return json({ ok: true })
  } })
  assert.equal(app.sync.togglePoetry('dumu-shanxing'), false)
  assert.deepEqual([...app.sync.savedPoetryIds.value], ['meng-chunxiao'])
  assert.equal(storage.getItem('daygarden_guest_data'), guest)
  assert.equal(app.calls.length, 0)
  await assert.rejects(app.sync.signIn('account_a', 'password', false, false), /登录失败/)
  assert.equal(storage.getItem('daygarden_guest_data'), guest)
  rejectLogin = false
  await app.sync.signIn('account_a', 'password', false, false)
  assert.equal(app.sync.savedPoetryIds.value.length, 0)
  assert.ok(!app.calls.some(([path]) => path.startsWith('/api/poetry/')))
})

test('Favorites can be added and removed only by a signed-in account', async () => {
  const cloud = new Set(['meng-chunxiao'])
  const app = await loadApp({ fetch: async (path, options = {}) => {
    if (path === '/api/login') return json({ user })
    if (path === '/api/state') return json({ savedPoetry: [...cloud], dailyActions: {}, customEvents: [] })
    if (path.startsWith('/api/poetry/')) {
      const id = path.slice('/api/poetry/'.length)
      if (options.method === 'PUT') cloud.add(id)
      else cloud.delete(id)
    }
    return json({ ok: true })
  } })
  assert.equal(app.sync.togglePoetry('dumu-shanxing'), false)
  await app.sync.signIn('account_a', 'password', false, false)
  assert.ok(!cloud.has('dumu-shanxing'))
  assert.equal(app.sync.togglePoetry('dumu-shanxing'), true)
  await app.sync.refreshCloud()
  assert.ok(cloud.has('dumu-shanxing'))
  assert.equal(app.calls.filter(([path]) => path === '/api/poetry/dumu-shanxing').length, 1)
  await app.sync.signIn('account_a', 'password', false, false)
  assert.ok(cloud.has('meng-chunxiao'))
  assert.ok(!app.calls.some(([path]) => path === '/api/poetry/meng-chunxiao'))
  assert.equal(app.sync.togglePoetry('dumu-shanxing'), true)
  await app.sync.refreshCloud()
  assert.ok(!cloud.has('dumu-shanxing'))
  await app.sync.signOut()
  assert.equal(app.sync.togglePoetry('dumu-shanxing'), false)
})

test('City defaults to Beijing, seeds a new account from the guest choice and restores its cloud choice on another browser', async () => {
  const city = { name: '上海', province: '上海', lat: 31.23, lon: 121.47 }
  const storage = memoryStorage(new Map([['daygarden_guest_preferences_v1', JSON.stringify({ selectedCity: city })]]))
  let cloudCity = null
  const fetch = async (path, options = {}) => {
    if (path === '/api/login') return json({ user })
    if (path === '/api/state') return json({ savedPoetry: [], dailyActions: {}, customEvents: [], selectedCity: cloudCity })
    if (path === '/api/city') cloudCity = JSON.parse(options.body)
    return json({ ok: true })
  }
  const app = await loadApp({ storage, fetch })
  assert.equal(app.storage.DEFAULT_PREFERENCES.selectedCity.name, '北京')
  await app.sync.signIn('account_a', 'password', false, false)
  assert.equal(cloudCity.name, '上海')
  assert.equal(app.storage.loadUserPreferences(user.id).selectedCity.name, '上海')
  await app.sync.signOut()
  storage.values.delete('daygarden_user_prefs_' + user.id)
  const guestPrefs = app.storage.loadUserPreferences()
  guestPrefs.selectedCity = { name: '广州', province: '广东', lat: 23.13, lon: 113.26 }
  app.storage.saveUserPreferences(guestPrefs)
  await app.sync.signIn('account_a', 'password', false, false)
  assert.equal(app.storage.loadUserPreferences(user.id).selectedCity.name, '上海')
  assert.equal(cloudCity.name, '上海')
  assert.equal(app.storage.loadUserPreferences().selectedCity.name, '广州')
})

test('Offline city changes coalesce and survive reload; stale cloud responses cannot undo a newer city choice', async () => {
  const storage = accountStorage()
  const shanghai = { name: '上海', province: '上海', lat: 31.23, lon: 121.47 }
  const beijing = { name: '北京', province: '北京', lat: 39.9, lon: 116.4 }
  let online = false
  let cloudCity = null
  let delayed = false
  let release
  const fetch = async (path, options = {}) => {
    if (!online) throw new Error('offline')
    if (path === '/api/city') cloudCity = JSON.parse(options.body)
    if (path === '/api/state') {
      const selectedCity = cloudCity
      if (delayed) await new Promise(resolve => { release = resolve })
      return json({ savedPoetry: [], dailyActions: {}, customEvents: [], selectedCity })
    }
    return json({ ok: true })
  }
  const app = await loadApp({ storage, fetch })
  await app.sync.syncSelectedCity(shanghai)
  await app.sync.syncSelectedCity(beijing)
  const queued = JSON.parse(storage.getItem('daygarden_account_' + user.id)).pending
  assert.equal(queued.length, 1)
  assert.equal(queued[0].value.name, '北京')
  assert.equal(app.sync.account.status, 'offline')
  const reloaded = await loadApp({ storage, fetch })
  assert.equal(reloaded.storage.loadUserPreferences(user.id).selectedCity.name, '北京')
  online = true
  await reloaded.sync.refreshCloud()
  assert.equal(cloudCity.name, '北京')
  assert.equal(JSON.parse(storage.getItem('daygarden_account_' + user.id)).pending.length, 0)
  delayed = true
  const refresh = reloaded.sync.refreshCloud()
  await new Promise(resolve => setTimeout(resolve, 0))
  await reloaded.sync.syncSelectedCity(shanghai)
  release()
  await refresh
  assert.equal(reloaded.storage.loadUserPreferences(user.id).selectedCity.name, '上海')
})

test('Gregorian validation rejects normalization; lunar and leap-day recurrence agree with the calendar', async () => {
  const { validation: v, calendar: c, day } = await loadApp()
  for (const date of ['2026-02-30', '2026-02-29', '13-01', '02-31']) assert.equal(v.parseEventDate(date), null)
  assert.equal(v.parseEventDate('1990年10月8日').date, '1990-10-08')
  assert.equal(c.calculateNextEventDate('02-29', false, new Date(2026, 2, 1)).nextDateSolar, '2028年2月29日')
  assert.equal(c.calculateNextEventDate('2026-02-30').daysLeft, 9999)
  const lunar = { ...event(), date: '08-15', isLunar: true }
  const solar = c.eventDateInYear(lunar.date, true, 2026)
  assert.equal(day.localDateKey(solar), '2026-09-25')
  const duplicate = { ...lunar, id: 'same-day', title: '第二个生日' }
  assert.equal(c.eventsBySolarDate([lunar, duplicate], [2026]).get('2026-09-25').length, 2)
  assert.equal(c.calculateNextEventDate('08-15', true, new Date(2026, 8, 24)).daysLeft, 1)
  const winter = c.eventDateInYear('12-29', true, 2025)
  assert.equal(c.eventsBySolarDate([{ ...lunar, date: '12-29' }], [2026]).get(day.localDateKey(winter)).length, 1)
  for (let year = 2024; year <= 2027; year++) assert.ok(c.eventDateInYear('02-30', true, year))
})

test('Import validates every supplied field, merges defaults and preserves empty notes and unique order', async () => {
  const app = await loadApp()
  const { storage: s, validation: v } = app
  for (const input of [[], null, {}, { version: 9, preferences: {} }, { selectedCity: { name: '错误' } }, { modules: { calendar: 'yes' } }, { customEvents: [event(), event()] }, { customEvents: [{ ...event(), date: '02-30' }] }]) assert.throws(() => s.importPreferences(input))
  const imported = s.importPreferences({ version: 2, preferences: { theme: 'dark', customEvents: [] } })
  assert.equal(imported.theme, 'dark'); assert.equal(imported.customEvents.length, 0); assert.ok(imported.selectedCity.name)
  assert.throws(() => v.validateEventList({ events: [] }))
  assert.throws(() => v.validateLifeEvent({ ...event(), type: 'holiday' }))
  assert.throws(() => v.validateLifeEvent({ ...event(), isLunar: 'false' }))
  assert.equal(s.getNormalizedCardOrder(['calendar', 'calendar', 'bogus']).filter(id => id === 'calendar').length, 1)
  s.saveQuickNotes([]); assert.equal(s.loadQuickNotes().length, 0)
  app.local.fail = true
  assert.equal(s.saveQuickNotes([]), false)
  assert.match(app.persistence.storageState.error, /存储|保存/)
})

test('Offline event create/edit/delete survives reload, coalesces changes and retries only individual operations', async () => {
  const storage = accountStorage()
  let online = false
  const cloud = new Map()
  const fetch = async (path, options = {}) => {
    if (!online) throw new Error('offline')
    if (path === '/api/state') return json({ savedPoetry: [], dailyActions: {}, customEvents: [...cloud.values()] })
    if (options.method === 'PUT') cloud.set(path.split('/').at(-1), JSON.parse(options.body))
    if (options.method === 'DELETE') cloud.delete(path.split('/').at(-1))
    return json({ ok: true })
  }
  let app = await loadApp({ storage, fetch })
  const first = event()
  await app.sync.syncCustomEvents([first], [])
  const updated = event('birthday-a', '已修改生日')
  await app.sync.syncCustomEvents([updated], [first])
  assert.equal(app.sync.account.status, 'offline')
  let persisted = JSON.parse(storage.getItem('daygarden_account_user-a'))
  assert.equal(persisted.pending.length, 1); assert.equal(persisted.pending[0].value.title, '已修改生日')
  app = await loadApp({ storage, fetch }); online = true
  await app.sync.refreshCloud()
  assert.equal(cloud.get('birthday-a').title, '已修改生日')
  assert.equal(app.sync.account.status, 'synced')
  online = false
  await app.sync.syncCustomEvents([], [updated])
  assert.equal(JSON.parse(storage.getItem('daygarden_account_user-a')).pending[0].method, 'DELETE')
  online = true; await app.sync.refreshCloud()
  assert.equal(cloud.size, 0)
  assert.equal(app.storage.loadUserPreferences(user.id).customEvents.length, 0)
  assert.ok(app.calls.every(([path]) => path !== '/api/events'))
})

test('Unchanged event fields do not upload; failed local persistence is never reported as durable', async () => {
  const storage = accountStorage()
  const app = await loadApp({ storage, fetch: async () => { throw new Error('offline') } })
  const same = { title: '生日', date: '10-08', id: 'birthday-a', type: 'birthday', isLunar: false }
  await app.sync.syncCustomEvents([event()], [same])
  assert.equal(app.calls.length, 0)
  storage.fail = true
  await app.sync.syncCustomEvents([event()], [])
  assert.match(app.sync.account.error, /暂留在当前页面/)
  assert.ok(!app.sync.account.error.includes('已保存在本机'))
})

test('Cloud empty events replace cached events, and a stale fetch cannot overwrite a concurrent edit', async () => {
  const storage = accountStorage()
  let release
  let delayed = false
  const app = await loadApp({ storage, fetch: async (path) => {
    if (path === '/api/state') { if (delayed) await new Promise(resolve => { release = resolve }); return json({ savedPoetry: [], dailyActions: {}, customEvents: [] }) }
    return json({ ok: true })
  } })
  const prefs = app.storage.loadUserPreferences(user.id); prefs.customEvents = [event()]; app.storage.saveUserPreferences(prefs, user.id)
  await app.sync.refreshCloud(); assert.equal(app.storage.loadUserPreferences(user.id).customEvents.length, 0)
  delayed = true
  const refresh = app.sync.refreshCloud()
  while (!release) await new Promise(resolve => setImmediate(resolve))
  prefs.customEvents = [event()]; app.storage.saveUserPreferences(prefs, user.id)
  await app.sync.syncCustomEvents([event()], [])
  release(); await refresh
  assert.equal(app.storage.loadUserPreferences(user.id).customEvents.length, 1)
})

test('Guest merging never deletes cloud events that share an untouched example ID', async () => {
  const storage = accountStorage()
  storage.setItem('daygarden_guest_preferences_v1', JSON.stringify({ customEvents: [event('guest-new')] }))
  const app = await loadApp({ storage, fetch: async () => json({ ok: true }) })
  app.sync.mergeGuestIntoAccount()
  await new Promise(resolve => setImmediate(resolve))
  assert.ok(app.calls.some(([path, options]) => path === '/api/events/guest-new' && options.method === 'PUT'))
  assert.ok(app.calls.every(([, options]) => options.method !== 'DELETE'))
})

test('First upgrade accepts a cloud deletion, preserves old local events and restores them only on explicit recovery', async () => {
  const storage = accountStorage()
  storage.setItem('daygarden_account_user-a', '{}')
  const cloud = new Map()
  const app = await loadApp({ storage, fetch: async (path, options = {}) => {
    if (path === '/api/state') return json({ savedPoetry: [], dailyActions: {}, customEvents: [...cloud.values()] })
    if (options.method === 'PUT') cloud.set(path.split('/').at(-1), JSON.parse(options.body))
    return json({ ok: true })
  } })
  const prefs = app.storage.loadUserPreferences(user.id); prefs.customEvents = [event()]; app.storage.saveUserPreferences(prefs, user.id)
  await app.sync.refreshCloud()
  assert.equal(app.storage.loadUserPreferences(user.id).customEvents.length, 0)
  assert.equal(cloud.size, 0)
  assert.equal(app.sync.legacyCustomEvents.value.length, 1)
  assert.equal(JSON.parse(storage.getItem('daygarden_legacy_events_user-a')).length, 1)
  assert.ok(app.calls.every(([, options]) => !options.method || options.method === 'GET'))
  cloud.set('other-device', event('other-device'))
  await app.sync.recoverLegacyEvents()
  assert.equal(cloud.size, 2)
  assert.equal(app.sync.legacyCustomEvents.value.length, 0)
})

test('OAuth accepts only the active origin, popup, provider and nonce; closed and expired popups release busy', async () => {
  const app = await loadApp()
  const s = app.sync
  s.loginWithOAuth('google', false)
  const attempt = new URL(app.window.openedUrl, app.window.location.origin).searchParams.get('attempt')
  const valid = { origin: app.window.location.origin, source: app.popup, data: { type: 'daygarden-oauth-error', provider: 'google', attempt, message: '授权取消' } }
  for (const invalid of [{ ...valid, origin: 'https://untrusted.example' }, { ...valid, source: {} }, { ...valid, data: { ...valid.data, attempt: 'wrong' } }, { ...valid, data: { ...valid.data, provider: 'github' } }]) await s.handleOAuthMessage(invalid)
  assert.equal(s.account.busy, true); assert.equal(s.account.error, '')
  await s.handleOAuthMessage(valid); assert.equal(s.account.busy, false); assert.equal(s.account.error, '授权取消')
  s.loginWithOAuth('github', false); app.popup.closed = true
  for (const fn of app.timers.values()) fn()
  assert.equal(s.account.busy, false); assert.match(s.account.error, /关闭/)
  app.popup.closed = false; s.loginWithOAuth('google', false); app.clock.now += 600001
  for (const fn of app.timers.values()) fn()
  assert.equal(s.account.busy, false); assert.match(s.account.error, /超时/)
})

test('Shared date rolls over; notifications cover every eligible event, persist once per day and tolerate failed storage', async () => {
  const app = await loadApp()
  app.day.updateCurrentTime(new Date(2026, 9, 1, 23, 59)); assert.equal(app.day.currentDate.value, '2026-10-01')
  app.day.updateCurrentTime(new Date(2026, 9, 2)); assert.equal(app.day.currentDate.value, '2026-10-02')
  const events = [{ ...event('a'), daysLeft: 0 }, { ...event('b'), daysLeft: 3 }, { ...event('c'), daysLeft: 14 }, { ...event('d'), daysLeft: 7 }]
  const notify = () => true
  assert.equal(app.notifications.notifyUpcomingEvents(events, user.id, '2026-10-02', notify), 3)
  assert.equal(app.notifications.notifyUpcomingEvents(events, user.id, '2026-10-02', notify), 0)
  const reload = await loadApp({ storage: app.local })
  assert.equal(reload.notifications.notifyUpcomingEvents(events, user.id, '2026-10-02', notify), 0)
  app.local.fail = true
  assert.equal(app.notifications.notifyUpcomingEvents(events, user.id, '2026-10-03', notify), 3)
  assert.equal(app.notifications.notifyUpcomingEvents(events, user.id, '2026-10-03', notify), 0)
})
