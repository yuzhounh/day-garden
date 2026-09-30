import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

const base = 'http://127.0.0.1:8787'
const suffix = randomBytes(5).toString('hex')
const password = randomBytes(20).toString('hex')
let checks = 0
async function request(path, { method = 'GET', data, cookie, origin = base } = {}) {
  const response = await fetch(base + path, { method, headers: { Origin: origin, ...(data ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: data ? JSON.stringify(data) : undefined })
  const value = await response.json()
  return { status: response.status, value, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers }
}
function check(value, description) { assert.ok(value, description); checks++ }
const anonymous = await request('/api/state')
check(anonymous.status === 401, 'Unauthenticated data access is rejected')
const crossOrigin = await request('/api/register', { method: 'POST', origin: 'https://untrusted.example', data: {} })
check(crossOrigin.status === 403, 'Cross-origin mutations are rejected')
const first = await request('/api/register', { method: 'POST', data: { username: 'test_a_' + suffix, password } })
check(first.status === 200 && first.cookie && first.value.user.id, 'Registration creates a session')
check(first.headers.get('set-cookie').includes('HttpOnly') && first.headers.get('set-cookie').includes('SameSite=Strict'), 'Session cookies have security flags')
const cookie = first.cookie
check((await request('/api/poetry/du-qiuxi', { method: 'PUT', cookie })).status === 200, 'Poetry can be saved')
check((await request('/api/habits/2026-09-30/move', { method: 'PUT', cookie })).status === 200, 'Daily habit can be saved')
check((await request('/api/habits/2026-09-30/move', { method: 'PUT', cookie })).status === 200, 'Repeated writes are idempotent')
let state = await request('/api/state', { cookie })
check(state.value.savedPoetry.includes('du-qiuxi') && state.value.dailyActions['2026-09-30'].length === 1, 'Saved state is persistent and deduplicated')
check((await request('/api/habits/2026-02-30/move', { method: 'PUT', cookie })).status === 400, 'Invalid calendar dates are rejected')
check((await request('/api/poetry/nonexistent', { method: 'PUT', cookie })).status === 400, 'Unknown poem IDs are rejected')
const second = await request('/api/register', { method: 'POST', data: { username: 'test_b_' + suffix, password } })
check(second.status === 200, 'A second independent user can register')
const secondState = await request('/api/state', { cookie: second.cookie })
check(secondState.value.savedPoetry.length === 0 && Object.keys(secondState.value.dailyActions).length === 0, 'Users cannot read another user’s data')
const badPassword = await request('/api/login', { method: 'POST', data: { username: 'test_a_' + suffix, password: 'incorrect_password' } })
check(badPassword.status === 401, 'Wrong passwords are rejected')
const login = await request('/api/login', { method: 'POST', data: { username: 'test_a_' + suffix, password } })
check(login.status === 200, 'The same account can sign in with a new session')
state = await request('/api/state', { cookie: login.cookie })
check(state.value.savedPoetry.includes('du-qiuxi'), 'A new session retrieves existing saved data')
check((await request('/api/poetry/du-qiuxi', { method: 'DELETE', cookie: login.cookie })).status === 200, 'A saved poem can be removed')
check((await request('/api/habits/2026-09-30/move', { method: 'DELETE', cookie: login.cookie })).status === 200, 'A habit completion can be undone')
state = await request('/api/state', { cookie: login.cookie })
check(state.value.savedPoetry.length === 0 && !state.value.dailyActions['2026-09-30'], 'Deleted state remains deleted')
await request('/api/logout', { method: 'POST', cookie: login.cookie })
check((await request('/api/state', { cookie: login.cookie })).status === 401, 'Logout invalidates the session')
let rateLimited = false
for (let i = 0; i < 11; i++) {
  const attempt = await request('/api/login', { method: 'POST', data: { username: 'test_a_' + suffix, password: 'incorrect_password' } })
  check([401, 429].includes(attempt.status), 'Repeated authentication attempts remain controlled')
  if (attempt.status === 429) { rateLimited = true; break }
}
check(rateLimited, 'Authentication is rate limited by the shared D1 counter')
console.log(checks + ' API checks passed (local D1 only).')
