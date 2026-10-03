import poetry from '../src/data/poetry-ids.json'
import { validateEventList, validateLifeEvent, validateCityOption } from '../src/services/validation'

interface Env {
  DB: D1Database
  ASSETS: Fetcher
  PASSWORD_PEPPER: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
}

interface User {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  providers?: string[]
}

interface UserRow extends User {
  password_hash: string
  salt: string
}

const poemIds = new Set(poetry)
const actionIds = new Set(['move', 'eyes', 'sleep'])
const encoder = new TextEncoder()
const sessionAge = 30 * 24 * 60 * 60

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

function json(value: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(value, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('')
}

function randomToken() {
  return hex(crypto.getRandomValues(new Uint8Array(32)).buffer)
}

async function digest(value: string) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

async function passwordHash(password: string, salt: string, pepper: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password + pepper), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256))
}

function equal(a: string, b: string) {
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m))
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function sessionToken(request: Request) {
  return request.headers.get('Cookie')?.match(/(?:^|;\s*)dg_session=([a-f0-9]{64})(?:;|$)/)?.[1]
}

function cookie(request: Request, token: string, age: number) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return 'dg_session=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + age + secure
}

function oauthStateCookie(request: Request, state: string, age: number) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return 'dg_oauth_state=' + state + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + age + secure
}

function getOauthState(request: Request) {
  return request.headers.get('Cookie')?.match(/(?:^|;\s*)dg_oauth_state=([^;]+)(?:;|$)/)?.[1]
}

interface OAuthContext { user_id: string | null; old_session_hash: string | null; origin: string; redirect_uri: string; attempt: string }
type Provider = 'google' | 'github'

function oauthOrigin(request: Request): string {
  const url = new URL(request.url)
  const origin = url.searchParams.get('return_origin') || url.origin
  const local = ['127.0.0.1', 'localhost'].includes(url.hostname)
  const localOrigins = ['http://127.0.0.1:5180', 'http://localhost:5180', 'http://127.0.0.1:8787', 'http://localhost:8787']
  if (origin !== url.origin && !(local && localOrigins.includes(origin))) throw new ApiError(400, '登录返回地址无效。')
  return origin
}

function oauthHtml(title: string, success: boolean, message: string, provider: string, origin: string, attempt = '') {
  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(message)
  const nonce = randomToken()
  const payload = JSON.stringify({ type: success ? 'daygarden-oauth-success' : 'daygarden-oauth-error', provider, message, attempt }).replace(/</g, '\\u003c')
  const target = JSON.stringify(origin)
  const returnUrl = JSON.stringify('/?' + new URLSearchParams({ oauth: success ? 'success' : 'error', attempt }))
  return new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} · Day Garden</title>
  <style>
    body {
      font-family: "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f4f5f7;
      color: #2e3832;
    }
    .card {
      background: #ffffff;
      padding: 32px 36px;
      border-radius: 20px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      text-align: center;
      max-width: 360px;
      border: 1px solid #e4e7e4;
    }
    h2 {
      margin: 0 0 10px;
      font-size: 1.25rem;
      font-weight: 600;
      color: ${success ? '#446b4e' : '#a56456'};
    }
    p {
      margin: 0 0 16px;
      color: #637067;
      font-size: 0.95rem;
      line-height: 1.6;
    }
    button {
      padding: 10px 20px;
      border: none;
      background: #768a76;
      color: white;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.95rem;
      font-family: inherit;
      font-weight: 500;
    }
    button:hover { background: #5c705c; }
  </style>
</head>
<body>
  <div class="card">
    <h2>${safeTitle}</h2>
    <p>${safeMessage}</p>
    ${!success ? `<a href="/?oauth=error&amp;attempt=${encodeURIComponent(attempt)}">返回花园</a>` : ''}
  </div>
  <script nonce="${nonce}">
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(${payload}, ${target});
        ${success ? 'setTimeout(function() { window.close(); }, 350);' : ''}
      } else {
        ${success ? `setTimeout(function() { window.location.href = ${returnUrl}; }, 500);` : ''}
      }
    } catch (e) {
      ${success ? `window.location.href = ${returnUrl};` : ''}
    }
  </script>
</body>
</html>`, {
    status: success ? 200 : 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'`,
      'X-Content-Type-Options': 'nosniff',
    }
  })
}

async function userFor(request: Request, env: Env): Promise<User | null> {
  const token = sessionToken(request)
  if (!token) return null
  const baseUser = await env.DB.prepare(
    'SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'
  ).bind(await digest(token), Date.now()).first<{ id: string; username: string }>()
  if (!baseUser) return null

  try {
    const oauthRows = await env.DB.prepare(
      'SELECT provider, display_name, avatar_url FROM oauth_accounts WHERE user_id = ?'
    ).bind(baseUser.id).all<{ provider: string; display_name: string | null; avatar_url: string | null }>()

    const providers = oauthRows.results.map(r => r.provider)
    const primary = oauthRows.results[0]
    return {
      id: baseUser.id,
      username: baseUser.username,
      displayName: primary?.display_name || undefined,
      avatarUrl: primary?.avatar_url || undefined,
      providers,
    }
  } catch {
    return baseUser
  }
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

async function handleOAuthUser(
  request: Request,
  env: Env,
  provider: 'google' | 'github',
  providerUserId: string,
  email: string | null,
  displayName: string | null,
  avatarUrl: string | null,
  suggestedUsername: string | undefined,
  context: OAuthContext
): Promise<Response> {
  const existing = await env.DB.prepare(
    'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?'
  ).bind(provider, providerUserId).first<{ user_id: string }>()

  let targetUserId = existing?.user_id || null
  if (context.user_id && targetUserId && targetUserId !== context.user_id) throw new ApiError(409, '此第三方账户已绑定另一个花园账户。')

  if (targetUserId) {
    await env.DB.prepare(`
      UPDATE oauth_accounts
      SET email = COALESCE(?, email), display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url)
      WHERE provider = ? AND provider_user_id = ?
    `).bind(email, displayName, avatarUrl, provider, providerUserId).run()
  } else {
    if (context.user_id) {
      const bound = await env.DB.prepare('SELECT provider_user_id FROM oauth_accounts WHERE provider = ? AND user_id = ?').bind(provider, context.user_id).first()
      if (bound) throw new ApiError(409, '此账户已绑定该登录方式，请先解除原绑定。')
      targetUserId = context.user_id
    } else {
      const baseRaw = (suggestedUsername || displayName || email?.split('@')[0] || `${provider}_user`).toLowerCase()
      let base = baseRaw.replace(/[^a-z0-9_]/g, '')
      if (base.length < 3) base = `${provider}_${base}`
      base = base.slice(0, 20)

      let finalUsername = base
      let count = 0
      while (count < 10) {
        const conflict = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(finalUsername).first()
        if (!conflict) break
        count++
        finalUsername = `${base}_${hex(crypto.getRandomValues(new Uint8Array(2)).buffer)}`
      }

      const newUserId = crypto.randomUUID()
      await env.DB.prepare(
        'INSERT INTO users(id, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(newUserId, finalUsername, `oauth:${provider}`, '', Date.now()).run()

      targetUserId = newUserId
    }

    await env.DB.prepare(`
      INSERT INTO oauth_accounts(provider, provider_user_id, user_id, email, display_name, avatar_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(provider, providerUserId, targetUserId, email, displayName, avatarUrl, Date.now()).run()
  }

  const user = await env.DB.prepare('SELECT id, username FROM users WHERE id = ?').bind(targetUserId).first<User>()
  if (!user) throw new ApiError(500, '用户检索失败。')

  const token = randomToken()
  const oldToken = sessionToken(request)
  const statements = [env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Date.now())]
  const oldHash = context.old_session_hash || (oldToken ? await digest(oldToken) : null)
  if (oldHash) statements.push(env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(oldHash))
  statements.push(env.DB.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await digest(token), user.id, Date.now() + sessionAge * 1000))
  await env.DB.batch(statements)

  const resp = oauthHtml('登录成功', true, `欢迎进入日常花园，${displayName || user.username}！`, provider, context.origin, context.attempt)
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  resp.headers.set('Set-Cookie', cookie(request, token, sessionAge))
  resp.headers.append('Set-Cookie', `dg_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`)
  return resp
}

async function startOAuth(request: Request, env: Env, provider: Provider): Promise<Response> {
  const url = new URL(request.url)
  const origin = oauthOrigin(request)
  const attempt = url.searchParams.get('attempt') || ''
  if (attempt && !/^[a-zA-Z0-9_-]{1,64}$/.test(attempt)) throw new ApiError(400, '登录请求编号无效。')
  const clientId = provider === 'google' ? env.GOOGLE_CLIENT_ID : env.GITHUB_CLIENT_ID
  const clientSecret = provider === 'google' ? env.GOOGLE_CLIENT_SECRET : env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) return oauthHtml('登录暂不可用', false, '此登录方式尚未配置，请使用其他方式。', provider, origin, attempt)
  const link = url.searchParams.get('mode') === 'link'
  const user = await userFor(request, env)
  if (link && !user) return oauthHtml('请先登录', false, '登录当前账户后才能关联其他登录方式。', provider, origin, attempt)
  const state = randomToken()
  const token = sessionToken(request)
  const redirectUri = `${origin}/api/auth/${provider}/callback`
  await env.DB.batch([
    env.DB.prepare('DELETE FROM oauth_states WHERE expires_at <= ?').bind(Date.now()),
    env.DB.prepare('INSERT INTO oauth_states(state_hash, provider, user_id, old_session_hash, origin, redirect_uri, attempt, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(await digest(state), provider, link ? user!.id : null, token ? await digest(token) : null, origin, redirectUri, attempt, Date.now() + 600000),
  ])
  const authUrl = new URL(provider === 'google' ? 'https://accounts.google.com/o/oauth2/v2/auth' : 'https://github.com/login/oauth/authorize')
  authUrl.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: provider === 'google' ? 'openid email profile' : 'read:user user:email', state, ...(provider === 'google' ? { prompt: 'select_account' } : {}) }).toString()
  return new Response(null, { status: 302, headers: { Location: authUrl.href, 'Set-Cookie': oauthStateCookie(request, state, 600), 'Cache-Control': 'no-store' } })
}

async function oauthCallback(request: Request, env: Env, provider: Provider): Promise<Response> {
  const url = new URL(request.url)
  const state = url.searchParams.get('state')
  const cookieState = getOauthState(request)
  if (!state || !cookieState || !equal(state, cookieState)) return oauthHtml('安全校验未通过', false, '授权状态已失效，请关闭窗口后重新登录。', provider, url.origin)
  const context = await env.DB.prepare('DELETE FROM oauth_states WHERE state_hash = ? AND provider = ? AND expires_at > ? RETURNING user_id, old_session_hash, origin, redirect_uri, attempt')
    .bind(await digest(state), provider, Date.now()).first<OAuthContext>()
  if (!context) return oauthHtml('安全校验未通过', false, '授权已过期或已使用，请关闭窗口后重新登录。', provider, url.origin)
  const fail = (title: string, message: string) => oauthHtml(title, false, message, provider, context.origin, context.attempt)
  if (url.searchParams.has('error')) return fail('授权已取消', '授权已取消或被拒绝，你可以重新登录。')
  const code = url.searchParams.get('code')
  if (!code) return fail('安全校验未通过', '授权凭据缺失，请重新登录。')
  const clientId = provider === 'google' ? env.GOOGLE_CLIENT_ID : env.GITHUB_CLIENT_ID
  const clientSecret = provider === 'google' ? env.GOOGLE_CLIENT_SECRET : env.GITHUB_CLIENT_SECRET
  if (!clientId || !clientSecret) return fail('登录暂不可用', '此登录方式尚未配置，请使用其他方式。')
  try {
    const tokenRes = await fetch(provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'User-Agent': 'DayGardenApp/1.0' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: context.redirect_uri, grant_type: 'authorization_code' }), signal: AbortSignal.timeout(10000),
    })
    if (!tokenRes.ok) return fail('凭据交换失败', '授权服务暂时不可用，请重新登录。')
    const tokenData = await tokenRes.json<{ access_token?: string }>()
    if (!tokenData.access_token) return fail('凭据交换失败', '未能取得授权凭据，请重新登录。')
    const profileRes = await fetch(provider === 'google' ? 'https://www.googleapis.com/oauth2/v2/userinfo' : 'https://api.github.com/user', { headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'DayGardenApp/1.0' }, signal: AbortSignal.timeout(10000) })
    if (!profileRes.ok) return fail('信息获取失败', '无法读取授权账户，请稍后重试。')
    const profile = await profileRes.json<{ id: string | number; email?: string; name?: string; picture?: string; avatar_url?: string; login?: string }>()
    if (!profile.id) return fail('信息获取失败', '授权账户信息不完整，请重新登录。')
    return await handleOAuthUser(request, env, provider, String(profile.id), profile.email || null, profile.name || profile.login || null, profile.picture || profile.avatar_url || null, profile.login, context)
  } catch (error) {
    console.error('OAuth callback failed', error instanceof ApiError ? error.status : 'network or service error')
    return fail('登录处理出错', error instanceof ApiError ? error.message : '授权服务连接失败，请稍后重试。')
  }
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

async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname

  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method)) throw new ApiError(405, '不支持此请求。')

  // Check origin on non-GET mutations (except OAuth callbacks or dev mock)
  if (request.method !== 'GET') {
    const origin = request.headers.get('Origin')
    const local = ['127.0.0.1', 'localhost'].includes(url.hostname)
    if (origin !== url.origin && !(local && ['http://127.0.0.1:5180', 'http://localhost:5180', 'http://127.0.0.1:8787'].includes(origin || ''))) {
      throw new ApiError(403, '请求来源无效。')
    }
  }

  // 1. Health check
  if (path === '/api/health' && request.method === 'GET') {
    return json({ ok: true, app: 'day-garden' })
  }

  // 2. Current Session
  if (path === '/api/session' && request.method === 'GET') {
    return json({ user: await userFor(request, env) })
  }

  // 3. OAuth Providers status
  if (path === '/api/auth/providers' && request.method === 'GET') {
    return json({
      google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
      dev: ['127.0.0.1', 'localhost'].includes(url.hostname),
    })
  }

  const oauthRoute = path.match(/^\/api\/auth\/(google|github)(\/callback)?$/)
  if (oauthRoute && request.method === 'GET') {
    const provider = oauthRoute[1] as Provider
    return oauthRoute[2] ? oauthCallback(request, env, provider) : startOAuth(request, env, provider)
  }

  // 8. Local Dev Mock OAuth Login (Useful for local testing without cloud credentials)
  if (path === '/api/auth/mock' && request.method === 'POST') {
    const local = ['127.0.0.1', 'localhost'].includes(url.hostname)
    if (!local) throw new ApiError(403, '模拟登录仅限本地开发环境使用。')
    const data = await body(request)
    const provider = data.provider === 'github' ? 'github' : 'google'
    const mockId = provider === 'google' ? 'google_mock_uid_1001' : 'github_mock_uid_2002'
    const mockEmail = provider === 'google' ? 'gardener@gmail.com' : 'gardener@github.com'
    const mockName = provider === 'google' ? '花园花友 (Google)' : '代码园丁 (GitHub)'
    const mockAvatar = provider === 'google'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
      : 'https://avatars.githubusercontent.com/u/9919?v=4'
    const mockUsername = provider === 'google' ? 'google_gardener' : 'github_gardener'

    const currentUser = data.link === true ? await userFor(request, env) : null
    if (data.link === true && !currentUser) throw new ApiError(401, '请先登录再关联账户。')
    const token = sessionToken(request)
    const result = await handleOAuthUser(request, env, provider, mockId, mockEmail, mockName, mockAvatar, mockUsername, { user_id: currentUser?.id || null, old_session_hash: token ? await digest(token) : null, origin: url.origin, redirect_uri: '', attempt: '' })
    const headers = new Headers(result.headers)
    headers.set('Content-Type', 'application/json; charset=utf-8')
    headers.delete('Content-Security-Policy')
    return new Response(JSON.stringify({ ok: true }), { status: result.status, headers })
  }

  // 9. Unlink OAuth provider
  if (path === '/api/auth/unlink' && request.method === 'POST') {
    const user = await userFor(request, env)
    if (!user) throw new ApiError(401, '请先登录。')
    const data = await body(request)
    const provider = data.provider
    if (provider !== 'google' && provider !== 'github') throw new ApiError(400, '无效的授权服务商。')

    const userRow = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first<{ password_hash: string }>()
    const hasPassword = userRow && !userRow.password_hash.startsWith('oauth:')
    const otherProviders = (user.providers || []).filter(p => p !== provider)
    if (!hasPassword && otherProviders.length === 0) {
      throw new ApiError(400, '解绑失败：当前账户仅绑定了此登录方式，解绑后将无法登录。')
    }

    await env.DB.prepare('DELETE FROM oauth_accounts WHERE user_id = ? AND provider = ?').bind(user.id, provider).run()
    return json({ ok: true, user: await userFor(request, env) })
  }

  // 10. Password Auth: Login and Register
  if (['/api/login', '/api/register'].includes(path) && request.method === 'POST') {
    if (!env.PASSWORD_PEPPER) throw new ApiError(503, '账户服务尚未配置。')
    if (!await allowAuth(request, env)) throw new ApiError(429, '尝试次数较多，请稍后再试。')
    const data = await body(request)
    const username = typeof data.username === 'string' ? data.username.trim().toLowerCase() : ''
    const password = typeof data.password === 'string' ? data.password : ''
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username) && username.length <= 64
    const isUsername = /^[a-z0-9_]{3,32}$/.test(username)
    if ((!isEmail && !isUsername) || password.length < 10 || password.length > 128) {
      throw new ApiError(400, '账号需为有效邮箱或 3—32 位用户名（字母/数字/下划线），密码需为 10—128 位。')
    }
    let existing = await env.DB.prepare('SELECT id, username, password_hash, salt FROM users WHERE username = ?').bind(username).first<UserRow>()
    if (!existing && isEmail) {
      const oauthLink = await env.DB.prepare('SELECT user_id FROM oauth_accounts WHERE email = ?').bind(username).first<{ user_id: string }>()
      if (oauthLink?.user_id) {
        existing = await env.DB.prepare('SELECT id, username, password_hash, salt FROM users WHERE id = ?').bind(oauthLink.user_id).first<UserRow>()
      }
    }
    if (path === '/api/register') {
      if (existing) throw new ApiError(409, isEmail ? '该邮箱已被注册。' : '这个用户名已被使用。')
      const salt = randomToken()
      const user = { id: crypto.randomUUID(), username }
      const hash = await passwordHash(password, salt, env.PASSWORD_PEPPER)
      try {
        await env.DB.prepare('INSERT INTO users(id, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)').bind(user.id, username, hash, salt, Date.now()).run()
      } catch (error) {
        if (String(error).includes('UNIQUE')) throw new ApiError(409, isEmail ? '该邮箱已被注册。' : '这个用户名已被使用。')
        throw error
      }
      return issueSession(request, env, user)
    }
    const hash = await passwordHash(password, existing?.salt || 'day-garden-dummy-salt', env.PASSWORD_PEPPER)
    if (!existing || !equal(hash, existing.password_hash)) throw new ApiError(401, '用户名/邮箱或密码不正确。')
    return issueSession(request, env, { id: existing.id, username: existing.username })
  }

  // 11. Logout
  if (path === '/api/logout' && request.method === 'POST') {
    const token = sessionToken(request)
    if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await digest(token)).run()
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) })
  }

  // 12. Authenticated user routes below
  const user = await userFor(request, env)
  if (!user) throw new ApiError(401, '请先登录。')

  // 13. State fetch
  if (path === '/api/state' && request.method === 'GET') {
    const [saved, actions, events, preferences] = await Promise.all([
      env.DB.prepare('SELECT poem_id FROM saved_poetry WHERE user_id = ?').bind(user.id).all<{ poem_id: string }>(),
      env.DB.prepare('SELECT date, action_id FROM daily_actions WHERE user_id = ? ORDER BY date DESC LIMIT 1098').bind(user.id).all<{ date: string; action_id: string }>(),
      env.DB.prepare('SELECT id, title, date, is_lunar, type, role, gift_advice FROM custom_events WHERE user_id = ? ORDER BY created_at ASC').bind(user.id).all<{ id: string; title: string; date: string; is_lunar: number; type: string; role?: string; gift_advice?: string }>(),
      env.DB.prepare('SELECT selected_city FROM users WHERE id = ?').bind(user.id).first<{ selected_city: string | null }>(),
    ])
    const dailyActions: Record<string, string[]> = {}
    for (const action of actions.results) (dailyActions[action.date] ||= []).push(action.action_id)
    const customEvents = (events.results || []).map(e => ({
      id: e.id,
      title: e.title,
      date: e.date,
      isLunar: Boolean(e.is_lunar),
      type: e.type,
      role: e.role || undefined,
      giftAdvice: e.gift_advice || undefined,
    }))
    const selectedCity = preferences?.selected_city ? validateCityOption(JSON.parse(preferences.selected_city)) : null
    return json({ savedPoetry: saved.results.map(row => row.poem_id), dailyActions, customEvents, selectedCity })
  }

  if (path === '/api/city' && request.method === 'PUT') {
    let city
    try { city = validateCityOption(await body(request)) } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(400, (error as Error).message)
    }
    await env.DB.prepare('UPDATE users SET selected_city = ? WHERE id = ?').bind(JSON.stringify(city), user.id).run()
    return json({ ok: true })
  }

  // 14. Custom events sync and mutations
  if (path === '/api/events' && request.method === 'PUT') {
    const data = await body(request)
    try { validateEventList(data.events) } catch (error) { throw new ApiError(400, (error as Error).message) }
    throw new ApiError(405, '整份日程替换已停用，请使用单项日程接口。')
  }

  const singleEventMatch = path.match(/^\/api\/events\/([a-zA-Z0-9_-]{1,128})$/)
  if ((path === '/api/events' && request.method === 'POST') || (singleEventMatch && request.method === 'PUT')) {
    let ev
    try { ev = validateLifeEvent(await body(request)) } catch (error) {
      if (error instanceof ApiError) throw error
      throw new ApiError(400, (error as Error).message)
    }
    if (singleEventMatch && singleEventMatch[1] !== ev.id) throw new ApiError(400, '日程编号与路径不一致。')
    const { id, title, date, isLunar, type } = ev
    const role = ev.role || null
    const giftAdvice = ev.giftAdvice || null
    await env.DB.prepare(`
      INSERT INTO custom_events(id, user_id, title, date, is_lunar, type, role, gift_advice, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, id) DO UPDATE SET
        title = excluded.title,
        date = excluded.date,
        is_lunar = excluded.is_lunar,
        type = excluded.type,
        role = excluded.role,
        gift_advice = excluded.gift_advice
    `).bind(
      id,
      user.id,
      title.slice(0, 64),
      date.slice(0, 32),
      isLunar ? 1 : 0,
      type,
      role,
      giftAdvice,
      Date.now()
    ).run()
    return json({ ok: true })
  }

  if (singleEventMatch && request.method === 'DELETE') {
    const id = singleEventMatch[1]!
    await env.DB.prepare('DELETE FROM custom_events WHERE user_id = ? AND id = ?').bind(user.id, id).run()
    return json({ ok: true })
  }

  // 15. Poetry favorite toggle
  const poemMatch = path.match(/^\/api\/poetry\/([a-z0-9-]+)$/)
  if (poemMatch && ['PUT', 'DELETE'].includes(request.method)) {
    const id = poemMatch[1]!
    if (!poemIds.has(id)) throw new ApiError(400, '诗词不存在。')
    await env.DB.prepare(request.method === 'PUT' ? 'INSERT OR IGNORE INTO saved_poetry(user_id, poem_id) VALUES (?, ?)' : 'DELETE FROM saved_poetry WHERE user_id = ? AND poem_id = ?').bind(user.id, id).run()
    return json({ ok: true })
  }

  // 16. Daily habit toggle
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
    try {
      return await api(request, env)
    } catch (error) {
      if (error instanceof ApiError) return json({ error: error.message }, error.status)
      console.error('Day Garden API error', error instanceof Error ? error.message : 'Unknown error')
      return json({ error: '同步暂时不可用，请稍后再试。' }, 503)
    }
  },
} satisfies ExportedHandler<Env>
