import test from 'node:test'
import assert from 'node:assert/strict'
import { loadWorker, json, cookieFrom } from './helpers.mjs'

for (const provider of ['google', 'github']) test(`${provider}: real callback route binds with Lax state alone, consumes once and preserves the password account`, async () => {
  const exchanges = []
  const app = await loadWorker(async (url, options) => {
    exchanges.push([url, options])
    if (url.includes('/token') || url.includes('/access_token')) return json({ access_token: 'provider-test-token' })
    return json({ id: provider + '-id', name: 'Test Gardener', login: 'test_gardener', email: 'test@example.test' })
  })
  try {
    const registration = await app.request('/api/register', { method: 'POST', data: { username: 'test_gardener', password: 'test-password-12345' } })
    const original = (await registration.json()).user
    const sessionCookie = cookieFrom(registration)
    const start = await app.request(`/api/auth/${provider}?mode=link&attempt=test-attempt`, { cookie: sessionCookie })
    assert.equal(start.status, 302)
    const authorize = new URL(start.headers.get('location'))
    assert.equal(authorize.searchParams.get('redirect_uri'), `https://garden.test/api/auth/${provider}/callback`)
    assert.match(start.headers.get('set-cookie'), /SameSite=Lax/)
    const state = authorize.searchParams.get('state')
    const callbackPath = `/api/auth/${provider}/callback?state=${state}&code=test-code`
    const callback = await app.request(callbackPath, { cookie: cookieFrom(start, 'dg_oauth_state') })
    const html = await callback.text()
    assert.match(html, /daygarden-oauth-success/)
    assert.match(html, /test-attempt/)
    assert.match(html, /postMessage\([\s\S]*, "https:\/\/garden.test"\)/)
    assert.match(callback.headers.get('content-security-policy'), /script-src 'nonce-/)
    assert.equal(new URLSearchParams(exchanges[0][1].body).get('redirect_uri'), `https://garden.test/api/auth/${provider}/callback`)
    const session = await app.request('/api/session', { cookie: cookieFrom(callback) })
    const linked = (await session.json()).user
    assert.equal(linked.id, original.id); assert.ok(linked.providers.includes(provider))
    assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 1)
    assert.equal((await (await app.request('/api/session', { cookie: sessionCookie })).json()).user, null)
    const replay = await app.request(callbackPath, { cookie: cookieFrom(start, 'dg_oauth_state') })
    assert.match(await replay.text(), /daygarden-oauth-error/)
    const unlink = await app.request('/api/auth/unlink', { method: 'POST', cookie: cookieFrom(callback), data: { provider } })
    assert.equal(unlink.status, 200)
    const passwordLogin = await app.request('/api/login', { method: 'POST', data: { username: 'test_gardener', password: 'test-password-12345' } })
    assert.equal((await passwordLogin.json()).user.id, original.id)
  } finally { app.close() }
})

test('OAuth rejects malicious origins, unknown states, cross-provider callbacks and unconfigured linking; localhost host stays consistent', async () => {
  const app = await loadWorker()
  try {
    assert.equal((await app.request('/api/auth/google?return_origin=https://evil.test')).status, 400)
    const unlinked = await app.request('/api/auth/google?mode=link&attempt=test')
    assert.equal(unlinked.status, 400)
    assert.match(await unlinked.text(), /请先登录/)
    const start = await app.request('/api/auth/google?attempt=test', { host: 'http://127.0.0.1:5180', origin: 'http://127.0.0.1:5180' })
    const authorize = new URL(start.headers.get('location'))
    assert.equal(authorize.searchParams.get('redirect_uri'), 'http://127.0.0.1:5180/api/auth/google/callback')
    const state = authorize.searchParams.get('state')
    const cookie = cookieFrom(start, 'dg_oauth_state')
    for (const [path, stateCookie] of [[`/api/auth/google/callback?state=wrong&code=x`, cookie], [`/api/auth/github/callback?state=${state}&code=x`, cookie]]) {
      const response = await app.request(path, { cookie: stateCookie })
      assert.match(await response.text(), /daygarden-oauth-error/)
    }
    assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 0)
  } finally { app.close() }
})
