import poetry from '../src/data/poetry-curated.json'

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

const poemIds = new Set(poetry.map(poem => poem.id))
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

function getRedirectUri(request: Request, provider: string): string {
  const url = new URL(request.url)
  const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '')
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host
  return `${proto}://${host}/api/auth/${provider}/callback`
}

function oauthHtml(title: string, success: boolean, message: string, provider: string) {
  const safeTitle = escapeHtml(title)
  const safeMessage = escapeHtml(message)
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
    ${!success ? '<button onclick="window.close() || (window.location.href = \'/\')">返回页面</button>' : ''}
  </div>
  <script>
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: '${success ? 'daygarden-oauth-success' : 'daygarden-oauth-error'}',
          provider: '${escapeHtml(provider)}',
          message: '${safeMessage}'
        }, '*');
        ${success ? 'setTimeout(function() { window.close(); }, 350);' : ''}
      } else {
        ${success ? 'setTimeout(function() { window.location.href = \'/\'; }, 500);' : ''}
      }
    } catch (e) {
      ${success ? 'window.location.href = \'/\';' : ''}
    }
  </script>
</body>
</html>`, {
    status: success ? 200 : 400,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
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
  suggestedUsername?: string
): Promise<Response> {
  const existing = await env.DB.prepare(
    'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?'
  ).bind(provider, providerUserId).first<{ user_id: string }>()

  let targetUserId = existing?.user_id || null

  if (targetUserId) {
    await env.DB.prepare(`
      UPDATE oauth_accounts
      SET email = COALESCE(?, email), display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url)
      WHERE provider = ? AND provider_user_id = ?
    `).bind(email, displayName, avatarUrl, provider, providerUserId).run()
  } else {
    const currentLoggedUser = await userFor(request, env)
    if (currentLoggedUser) {
      targetUserId = currentLoggedUser.id
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
  if (oldToken) statements.push(env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await digest(oldToken)))
  statements.push(env.DB.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await digest(token), user.id, Date.now() + sessionAge * 1000))
  await env.DB.batch(statements)

  const resp = oauthHtml('登录成功', true, `欢迎进入日常花园，${displayName || user.username}！`, provider)
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  resp.headers.set('Set-Cookie', cookie(request, token, sessionAge))
  resp.headers.append('Set-Cookie', `dg_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`)
  return resp
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

  // 4. Google OAuth Redirect
  if (path === '/api/auth/google' && request.method === 'GET') {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return oauthHtml(
        'Google 登录未配置',
        false,
        '服务端尚未配置 GOOGLE_CLIENT_ID 与 GOOGLE_CLIENT_SECRET 凭据。请在 Cloudflare Pages 环境变量或本地 .dev.vars 中设置。',
        'google'
      )
    }
    const state = randomToken()
    const redirectUri = getRedirectUri(request, 'google')
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(env.GOOGLE_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('openid email profile')}` +
      `&state=${state}` +
      `&prompt=select_account`

    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl,
        'Set-Cookie': oauthStateCookie(request, state, 600),
      },
    })
  }

  // 5. Google OAuth Callback
  if (path === '/api/auth/google/callback' && request.method === 'GET') {
    const errorParam = url.searchParams.get('error')
    if (errorParam) {
      return oauthHtml('Google 授权已取消', false, '你已取消 Google 授权登录，或授权被拒绝。', 'google')
    }
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const cookieState = getOauthState(request)

    if (!code || !state || !cookieState || !equal(state, cookieState)) {
      return oauthHtml('安全校验未通过', false, '授权状态校验失效（可能已过期），请返回重试。', 'google')
    }
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      return oauthHtml('配置缺失', false, '未找到 Google OAuth 服务端配置凭据。', 'google')
    }

    try {
      const redirectUri = getRedirectUri(request, 'google')
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenRes.ok) {
        const errText = await tokenRes.text()
        console.error('Google token exchange error', errText)
        return oauthHtml('凭据交换失败', false, '向 Google 兑换访问令牌失败，请检查 Redirect URI 配置。', 'google')
      }

      const tokenData = await tokenRes.json<{ access_token: string }>()
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      })
      if (!profileRes.ok) {
        return oauthHtml('信息获取失败', false, '获取 Google 用户基本资料失败。', 'google')
      }

      const profile = await profileRes.json<{ id: string; email?: string; name?: string; picture?: string }>()
      return await handleOAuthUser(request, env, 'google', profile.id, profile.email || null, profile.name || null, profile.picture || null)
    } catch (e) {
      console.error('Google OAuth callback error', e)
      return oauthHtml('登录处理出错', false, '处理 Google 登录时发生网络或服务异常。', 'google')
    }
  }

  // 6. GitHub OAuth Redirect
  if (path === '/api/auth/github' && request.method === 'GET') {
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return oauthHtml(
        'GitHub 登录未配置',
        false,
        '服务端尚未配置 GITHUB_CLIENT_ID 与 GITHUB_CLIENT_SECRET 凭据。请在 Cloudflare Pages 环境变量或本地 .dev.vars 中设置。',
        'github'
      )
    }
    const state = randomToken()
    const redirectUri = getRedirectUri(request, 'github')
    const authUrl = `https://github.com/login/oauth/authorize?` +
      `client_id=${encodeURIComponent(env.GITHUB_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent('read:user user:email')}` +
      `&state=${state}`

    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl,
        'Set-Cookie': oauthStateCookie(request, state, 600),
      },
    })
  }

  // 7. GitHub OAuth Callback
  if (path === '/api/auth/github/callback' && request.method === 'GET') {
    const errorParam = url.searchParams.get('error')
    if (errorParam) {
      return oauthHtml('GitHub 授权已取消', false, '你已取消 GitHub 授权登录，或授权被拒绝。', 'github')
    }
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const cookieState = getOauthState(request)

    if (!code || !state || !cookieState || !equal(state, cookieState)) {
      return oauthHtml('安全校验未通过', false, '授权状态校验失效（可能已过期），请返回重试。', 'github')
    }
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      return oauthHtml('配置缺失', false, '未找到 GitHub OAuth 服务端配置凭据。', 'github')
    }

    try {
      const redirectUri = getRedirectUri(request, 'github')
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'DayGardenApp/1.0',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        }),
      })

      const tokenData = await tokenRes.json<{ access_token?: string; error?: string; error_description?: string }>()
      if (!tokenData.access_token) {
        console.error('GitHub token exchange error', tokenData)
        return oauthHtml('凭据交换失败', false, tokenData.error_description || '向 GitHub 兑换访问令牌失败。', 'github')
      }

      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'User-Agent': 'DayGardenApp/1.0',
        },
      })
      if (!userRes.ok) {
        return oauthHtml('信息获取失败', false, '获取 GitHub 用户资料失败。', 'github')
      }
      const ghProfile = await userRes.json<{ id: number; login: string; name?: string; avatar_url?: string; email?: string }>()

      let email = ghProfile.email || null
      if (!email) {
        try {
          const emailsRes = await fetch('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'DayGardenApp/1.0' },
          })
          if (emailsRes.ok) {
            const emails = await emailsRes.json<Array<{ email: string; primary: boolean; verified: boolean }>>()
            email = emails.find(e => e.primary && e.verified)?.email || emails[0]?.email || null
          }
        } catch {}
      }

      return await handleOAuthUser(
        request,
        env,
        'github',
        String(ghProfile.id),
        email,
        ghProfile.name || ghProfile.login,
        ghProfile.avatar_url || null,
        ghProfile.login
      )
    } catch (e) {
      console.error('GitHub OAuth callback error', e)
      return oauthHtml('登录处理出错', false, '处理 GitHub 登录时发生网络或服务异常。', 'github')
    }
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

    return await handleOAuthUser(request, env, provider, mockId, mockEmail, mockName, mockAvatar, mockUsername)
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
    if (!/^[a-z0-9_]{3,32}$/.test(username) || password.length < 10 || password.length > 128) {
      throw new ApiError(400, '用户名需为 3—32 位字母、数字或下划线，密码需为 10—128 位。')
    }
    const existing = await env.DB.prepare('SELECT id, username, password_hash, salt FROM users WHERE username = ?').bind(username).first<UserRow>()
    if (path === '/api/register') {
      if (existing) throw new ApiError(409, '这个用户名已被使用。')
      const salt = randomToken()
      const user = { id: crypto.randomUUID(), username }
      const hash = await passwordHash(password, salt, env.PASSWORD_PEPPER)
      try {
        await env.DB.prepare('INSERT INTO users(id, username, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)').bind(user.id, username, hash, salt, Date.now()).run()
      } catch (error) {
        if (String(error).includes('UNIQUE')) throw new ApiError(409, '这个用户名已被使用。')
        throw error
      }
      return issueSession(request, env, user)
    }
    const hash = await passwordHash(password, existing?.salt || 'day-garden-dummy-salt', env.PASSWORD_PEPPER)
    if (!existing || !equal(hash, existing.password_hash)) throw new ApiError(401, '用户名或密码不正确。')
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
    const [saved, actions] = await Promise.all([
      env.DB.prepare('SELECT poem_id FROM saved_poetry WHERE user_id = ?').bind(user.id).all<{ poem_id: string }>(),
      env.DB.prepare('SELECT date, action_id FROM daily_actions WHERE user_id = ? ORDER BY date DESC LIMIT 1098').bind(user.id).all<{ date: string; action_id: string }>(),
    ])
    const dailyActions: Record<string, string[]> = {}
    for (const action of actions.results) (dailyActions[action.date] ||= []).push(action.action_id)
    return json({ savedPoetry: saved.results.map(row => row.poem_id), dailyActions })
  }

  // 14. Poetry favorite toggle
  const poemMatch = path.match(/^\/api\/poetry\/([a-z0-9-]+)$/)
  if (poemMatch && ['PUT', 'DELETE'].includes(request.method)) {
    const id = poemMatch[1]!
    if (!poemIds.has(id)) throw new ApiError(400, '诗词不存在。')
    await env.DB.prepare(request.method === 'PUT' ? 'INSERT OR IGNORE INTO saved_poetry(user_id, poem_id) VALUES (?, ?)' : 'DELETE FROM saved_poetry WHERE user_id = ? AND poem_id = ?').bind(user.id, id).run()
    return json({ ok: true })
  }

  // 15. Daily habit toggle
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
