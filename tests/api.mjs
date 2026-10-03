import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787'
const suffix = randomBytes(5).toString('hex')
const password = randomBytes(20).toString('hex')
let checks = 0
async function request(path, { method = 'GET', data, cookie, origin = base } = {}) {
  const response = await fetch(base + path, { method, headers: { Origin: origin, ...(data ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: data ? JSON.stringify(data) : undefined })
  const value = response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text()
  return { status: response.status, value, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers }
}
function check(value, description) { assert.ok(value, description); checks++ }
const anonymous = await request('/api/state')
check(anonymous.status === 401, 'Unauthenticated data access is rejected')
for (const method of ['PUT', 'DELETE']) check((await request('/api/poetry/dumu-shanxing', { method })).status === 401, `Unauthenticated poetry ${method} is rejected`)
check((await request('/api/city', { method: 'PUT', data: {} })).status === 401, 'Unauthenticated city updates are rejected')
const crossOrigin = await request('/api/register', { method: 'POST', origin: 'https://untrusted.example', data: {} })
check(crossOrigin.status === 403, 'Cross-origin mutations are rejected')
const first = await request('/api/register', { method: 'POST', data: { username: 'test_a_' + suffix, password } })
check(first.status === 200 && first.cookie && first.value.user.id, `Registration creates a session (status ${first.status}, error ${first.value.error || 'none'})`)
check(first.headers.get('set-cookie').includes('HttpOnly') && first.headers.get('set-cookie').includes('SameSite=Strict'), 'Session cookies have security flags')
const cookie = first.cookie
const city = { name: '上海', province: '上海', lat: 31.23, lon: 121.47 }
check((await request('/api/state', { cookie })).value.selectedCity === null, 'A new account has no cloud city until first sync')
check((await request('/api/city', { method: 'PUT', cookie, data: city })).status === 200, 'The selected city is saved to the account')
for (const data of [{ ...city, lat: 91 }, { ...city, lon: '121.47' }]) check((await request('/api/city', { method: 'PUT', cookie, data })).status === 400, 'Invalid city coordinates are rejected')
check((await request('/api/state', { cookie })).value.selectedCity.name === '上海', 'Rejected city updates preserve the existing city')
check((await request('/api/poetry/dumu-shanxing', { method: 'PUT', cookie })).status === 200, 'Poetry can be saved')
check((await request('/api/habits/2026-09-30/move', { method: 'PUT', cookie })).status === 200, 'Daily habit can be saved')
check((await request('/api/events', { method: 'POST', cookie, data: { id: 'evt-test-1', title: '测试生日', date: '2010-08-28', isLunar: true } })).status === 200, 'Custom event can be saved')
check((await request('/api/habits/2026-09-30/move', { method: 'PUT', cookie })).status === 200, 'Repeated writes are idempotent')
check((await request('/api/events/evt-test-2', { method: 'PUT', cookie, data: { id: 'evt-test-2', title: '第二个生日', date: '10-08', type: 'birthday' } })).status === 200, 'Independent event writes coexist')
check((await request('/api/events/evt-test-1', { method: 'PUT', cookie, data: { id: 'evt-test-1', title: '修改后的生日', date: '2010-08-28', isLunar: true } })).status === 200, 'Editing one event preserves other events')
for (const data of [{ events: null }, { events: [{ id: 'bad', title: '错误日期', date: '2026-02-30' }] }]) check((await request('/api/events', { method: 'PUT', cookie, data })).status === 400, 'Invalid bulk data cannot erase stored events')
check((await request('/api/events', { method: 'PUT', cookie, data: { events: [] } })).status === 405, 'Destructive whole-list replacement is disabled')
check((await request('/api/events/bad', { method: 'PUT', cookie, data: { id: 'different', title: '路径错误', date: '10-01' } })).status === 400, 'Event path and payload identities must match')
let state = await request('/api/state', { cookie })
check(state.value.savedPoetry.includes('dumu-shanxing') && state.value.dailyActions['2026-09-30'].length === 1 && state.value.customEvents.some(e => e.id === 'evt-test-1'), 'Saved state is persistent and deduplicated')
check(state.value.customEvents.length === 2 && state.value.customEvents.some(e => e.title === '修改后的生日'), 'Rejected payloads preserve all previous events')
check((await request('/api/habits/2026-02-30/move', { method: 'PUT', cookie })).status === 400, 'Invalid calendar dates are rejected')
check((await request('/api/poetry/nonexistent', { method: 'PUT', cookie })).status === 400, 'Unknown poem IDs are rejected')
const second = await request('/api/register', { method: 'POST', data: { username: 'test_b_' + suffix, password } })
check(second.status === 200, 'A second independent user can register')
const secondState = await request('/api/state', { cookie: second.cookie })
check(secondState.value.savedPoetry.length === 0 && Object.keys(secondState.value.dailyActions).length === 0, 'Users cannot read another user’s data')
check(secondState.value.customEvents.length === 0, 'Custom events are isolated by user')
check(secondState.value.selectedCity === null, 'The selected city is isolated by user')
check((await request('/api/events/evt-test-1', { method: 'DELETE', cookie: second.cookie })).status === 200, 'Deleting another user event has no effect')
check((await request('/api/state', { cookie })).value.customEvents.length === 2, 'Other users cannot delete owned events')
const badPassword = await request('/api/login', { method: 'POST', data: { username: 'test_a_' + suffix, password: 'incorrect_password' } })
check(badPassword.status === 401, 'Wrong passwords are rejected')
const login = await request('/api/login', { method: 'POST', data: { username: 'test_a_' + suffix, password } })
check(login.status === 200, 'The same account can sign in with a new session')
state = await request('/api/state', { cookie: login.cookie })
check(state.value.savedPoetry.includes('dumu-shanxing'), 'A new session retrieves existing saved data')
check(state.value.selectedCity.name === '上海', 'A new session restores the selected city')
check((await request('/api/poetry/dumu-shanxing', { method: 'DELETE', cookie: login.cookie })).status === 200, 'A saved poem can be removed')
check((await request('/api/habits/2026-09-30/move', { method: 'DELETE', cookie: login.cookie })).status === 200, 'A habit completion can be undone')
state = await request('/api/state', { cookie: login.cookie })
check(state.value.savedPoetry.length === 0 && !state.value.dailyActions['2026-09-30'], 'Deleted state remains deleted')
for (const id of ['evt-test-1', 'evt-test-2']) check((await request('/api/events/' + id, { method: 'DELETE', cookie: login.cookie })).status === 200, 'Custom events can be deleted individually')
check((await request('/api/state', { cookie: login.cookie })).value.customEvents.length === 0, 'Deleting the last event returns a legitimate empty array')
await request('/api/logout', { method: 'POST', cookie: login.cookie })
check((await request('/api/state', { cookie: login.cookie })).status === 401, 'Logout invalidates the session')
let rateLimited = false
for (let i = 0; i < 11; i++) {
  const attempt = await request('/api/login', { method: 'POST', data: { username: 'test_a_' + suffix, password: 'incorrect_password' } })
  check([401, 429].includes(attempt.status), 'Repeated authentication attempts remain controlled')
  if (attempt.status === 429) { rateLimited = true; break }
}
check(rateLimited, 'Authentication is rate limited by the shared D1 counter')

// OAuth endpoints checks
const providers = await request('/api/auth/providers')
check(providers.status === 200 && typeof providers.value.dev === 'boolean', 'Auth providers endpoint returns configuration')

// Mock Google OAuth login
const mockGoogle = await request('/api/auth/mock', { method: 'POST', data: { provider: 'google' } })
check(mockGoogle.status === 200 && mockGoogle.cookie, 'Google mock auth creates a session')
check(mockGoogle.headers.get('content-type').includes('application/json'), 'Mock login agrees with the frontend JSON contract')
const googleSession = await request('/api/session', { cookie: mockGoogle.cookie })
check(googleSession.status === 200 && googleSession.value.user.providers.includes('google'), 'Google session contains provider tag')

// Mock GitHub OAuth login
const mockGithub = await request('/api/auth/mock', { method: 'POST', data: { provider: 'github' } })
check(mockGithub.status === 200 && mockGithub.cookie, 'GitHub mock auth creates a session')
const githubSession = await request('/api/session', { cookie: mockGithub.cookie })
check(githubSession.status === 200 && githubSession.value.user.providers.includes('github'), 'GitHub session contains provider tag')

console.log(checks + ' API checks passed (local D1 only).')

