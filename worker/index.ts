import poetry from '../src/data/poetry-curated.json'

interface Env {
  DB: D1Database
  ASSETS: Fetcher
  PASSWORD_PEPPER: string
}
interface User { id: string; username: string }
interface UserRow extends User { password_hash: string; salt: string }
const poemIds = new Set(poetry.map(poem => poem.id))
const actionIds = new Set(['move', 'eyes', 'sleep'])
const encoder = new TextEncoder()
const sessionAge = 30 * 24 * 60 * 60

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
function json(value: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } })
}
function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('') }
function randomToken() { return hex(crypto.getRandomValues(new Uint8Array(32)).buffer) }
async function digest(value: string) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value))) }
async function passwordHash(password: string, salt: string, pepper: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password + pepper), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256))
}
function equal(a: string, b: string) {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}
function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
function sessionToken(request: Request) { return request.headers.get('Cookie')?.match(/(?:^|;\s*)dg_session=([a-f0-9]{64})(?:;|$)/)?.[1] }
function cookie(request: Request, token: string, age: number) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return 'dg_session=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + age + secure
}
async function userFor(request: Request, env: Env): Promise<User | null> {
  const token = sessionToken(request)
  if (!token) return null
  return env.DB.prepare('SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?').bind(await digest(token), Date.now()).first<User>()
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('Content-Type')?.includes('application/json')) throw new ApiError(415, '请使用 JSON 格式。')
  const reader = request.body?.getReader()
  if (!reader) throw new ApiError(400, '请求内容为空。')
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const result = await reader.read()
    if (result.done) break
    size += result.value.byteLength
    if (size > 32768) { await reader.cancel(); throw new ApiError(413, '请求内容过大。') }
    chunks.push(result.value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    return parsed
  } catch { throw new ApiError(400, '请求格式有误。') }
}
async function issueSession(request: Request, env: Env, user: User) {
  const token = randomToken()
  const oldToken = sessionToken(request)
  const statements = [env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Date.now())]
  if (oldToken) statements.push(env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await digest(oldToken)))
  statements.push(env.DB.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await digest(token), user.id, Date.now() + sessionAge * 1000))
  await env.DB.batch(statements)
  return json({ user }, 200, { 'Set-Cookie': cookie(request, token, sessionAge) })
}

async function allowAuth(request: Request, env: Env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local'
  const key = await digest('daygarden-auth:' + ip + ':' + env.PASSWORD_PEPPER)
  const window = Math.floor(Date.now() / 60000) * 60000
  const result = await env.DB.batch<{ attempts: number }>([
    env.DB.prepare('DELETE FROM auth_attempts WHERE window_start < ?').bind(window - 86400000),
    env.DB.prepare(`INSERT INTO auth_attempts(ip_hash, window_start, attempts) VALUES (?, ?, 1)
      ON CONFLICT(ip_hash) DO UPDATE SET
        attempts = CASE WHEN auth_attempts.window_start = excluded.window_start THEN MIN(auth_attempts.attempts + 1, 11) ELSE 1 END,
        window_start = excluded.window_start
      RETURNING attempts`).bind(key, window),
  ])
  return Number(result[1]!.results[0]?.attempts) <= 10
}

async function api(request: Request, env: Env) {
  const url = new URL(request.url)
  const path = url.pathname
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) throw new ApiError(405, '不支持此请求。')
  if (request.method !== 'GET') {
    const origin = request.headers.get('Origin')
    const local = ['127.0.0.1', 'localhost'].includes(url.hostname)
    if (origin !== url.origin && !(local && ['http://127.0.0.1:5180', 'http://localhost:5180'].includes(origin || ''))) throw new ApiError(403, '请求来源无效。')
  }
  if (path === '/api/health' && request.method === 'GET') return json({ ok: true, app: 'day-garden' })
  if (path === '/api/session' && request.method === 'GET') return json({ user: await userFor(request, env) })
  if (['/api/login', '/api/register'].includes(path) && request.method === 'POST') {
    if (!env.PASSWORD_PEPPER) throw new ApiError(503, '账户服务尚未配置。')
    if (!await allowAuth(request, env)) throw new ApiError(429, '尝试次数较多，请稍后再试。')
    const data = await body(request)
    const username = typeof data.username === 'string' ? data.username.trim().toLowerCase() : ''
    const password = typeof data.password === 'string' ? data.password : ''
    if (!/^[a-z0-9_]{3,32}$/.test(username) || password.length < 10 || password.length > 128) throw new ApiError(400, '用户名需为 3—32 位字母、数字或下划线，密码需为 10—128 位。')
    const existing = await env.DB.prepare('SELECT id, username, password_hash, salt FROM users WHERE username = ?').bind(username).first<UserRow>()
    if (path === '/api/register') {
      if (existing) throw new ApiError(409, '这个用户名已被使用。')
      const salt = randomToken()
      const user = { id: crypto.randomUUID(), username }
      const hash = await passwordHash(password, salt, env.PASSWORD_PEPPER)
      try { await env.DB.prepare('INSERT INTO users(id, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)').bind(user.id, username, hash, salt, Date.now()).run() }
      catch (error) { if (String(error).includes('UNIQUE')) throw new ApiError(409, '这个用户名已被使用。'); throw error }
      return issueSession(request, env, user)
    }
    const hash = await passwordHash(password, existing?.salt || 'day-garden-dummy-salt', env.PASSWORD_PEPPER)
    if (!existing || !equal(hash, existing.password_hash)) throw new ApiError(401, '用户名或密码不正确。')
    return issueSession(request, env, { id: existing.id, username: existing.username })
  }
  if (path === '/api/logout' && request.method === 'POST') {
    const token = sessionToken(request)
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await digest(token)).run()
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) })
  }
  const user = await userFor(request, env)
  if (!user) throw new ApiError(401, '请先登录。')
  if (path === '/api/state' && request.method === 'GET') {
    const [saved, actions] = await Promise.all([
      env.DB.prepare('SELECT poem_id FROM saved_poetry WHERE user_id = ?').bind(user.id).all<{ poem_id: string }>(),
      env.DB.prepare('SELECT date, action_id FROM daily_actions WHERE user_id = ? ORDER BY date DESC LIMIT 1098').bind(user.id).all<{ date: string; action_id: string }>(),
    ])
    const dailyActions: Record<string, string[]> = {}
    for (const action of actions.results) (dailyActions[action.date] ||= []).push(action.action_id)
    return json({ savedPoetry: saved.results.map(row => row.poem_id), dailyActions })
  }
  const poemMatch = path.match(/^\/api\/poetry\/([a-z0-9-]+)$/)
  if (poemMatch && ['PUT', 'DELETE'].includes(request.method)) {
    const id = poemMatch[1]!
    if (!poemIds.has(id)) throw new ApiError(400, '诗词不存在。')
    await env.DB.prepare(request.method === 'PUT' ? 'INSERT OR IGNORE INTO saved_poetry(user_id, poem_id) VALUES (?, ?)' : 'DELETE FROM saved_poetry WHERE user_id = ? AND poem_id = ?').bind(user.id, id).run()
    return json({ ok: true })
  }
  const habitMatch = path.match(/^\/api\/habits\/(20\d{2}-\d{2}-\d{2})\/([a-z]+)$/)
  if (habitMatch && ['PUT', 'DELETE'].includes(request.method)) {
    const date = habitMatch[1]!, id = habitMatch[2]!
    if (!validDate(date) || !actionIds.has(id)) throw new ApiError(400, '打卡内容无效。')
    await env.DB.prepare(request.method === 'PUT' ? 'INSERT OR IGNORE INTO daily_actions(user_id, date, action_id) VALUES (?, ?, ?)' : 'DELETE FROM daily_actions WHERE user_id = ? AND date = ? AND action_id = ?').bind(user.id, date, id).run()
    return json({ ok: true })
  }
  throw new ApiError(404, '接口不存在。')
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!new URL(request.url).pathname.startsWith('/api/')) return env.ASSETS.fetch(request)
    try { return await api(request, env) }
    catch (error) {
      if (error instanceof ApiError) return json({ error: error.message }, error.status)
      console.error('Day Garden API error', error instanceof Error ? error.message : 'Unknown error')
      return json({ error: '同步暂时不可用，请稍后再试。' }, 503)
    }
  },
} satisfies ExportedHandler<Env>
