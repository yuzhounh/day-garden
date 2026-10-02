import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import vm from 'node:vm'

export const root = resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
export const json = (value, status = 200) => Response.json(value, { status })

export function memoryStorage(seed = new Map()) {
  return { values: seed, fail: false, getItem(key) { return seed.get(key) ?? null }, setItem(key, value) { if (this.fail) throw new Error('quota exceeded'); seed.set(key, value) }, removeItem(key) { seed.delete(key) } }
}

async function bundle(source, globals) {
  const result = await build({ stdin: { contents: source, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false, external: ['vue', 'lunar-javascript'], logLevel: 'silent' })
  const module = { exports: {} }
  vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, require, console, Request, Response, Headers, URL, URLSearchParams, TextEncoder, TextDecoder, AbortSignal, crypto, structuredClone, Blob, CustomEvent, setTimeout, clearTimeout, setInterval, clearInterval, ...globals })
  return module.exports
}

export async function loadApp({ storage = memoryStorage(), fetch = async () => json({}), now = Date.now() } = {}) {
  const clock = { now }
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [clock.now])) } static now() { return clock.now } }
  const timers = new Map()
  let timerId = 0
  const popup = { closed: false, close() { this.closed = true } }
  const window = Object.assign(new EventTarget(), { location: { origin: 'https://garden.test', href: 'https://garden.test/' }, history: { replaceState() {} }, screenX: 0, screenY: 0, outerWidth: 1200, outerHeight: 900, open(url) { this.openedUrl = url; return popup }, setInterval(fn) { timers.set(++timerId, fn); return timerId }, clearInterval(id) { timers.delete(id) }, setTimeout, clearTimeout })
  const calls = []
  const modules = await bundle(['storage', 'validation', 'calendar', 'sync', 'day', 'persistence', 'notifications', 'contentSelection'].map(name => `export * as ${name} from './src/services/${name}.ts'`).join('\n'), { localStorage: storage, sessionStorage: memoryStorage(), window, Date: ClockDate, fetch: async (...args) => { calls.push(args); return fetch(...args) } })
  return { ...modules, local: storage, window, popup, clock, timers, calls }
}

export async function loadWorker(providerFetch = async () => { throw new Error('Unexpected provider request') }) {
  const db = new DatabaseSync(':memory:')
  for (const name of readdirSync(resolve(root, 'worker/migrations')).filter(name => name.endsWith('.sql')).sort()) db.exec(readFileSync(resolve(root, 'worker/migrations', name), 'utf8'))
  function prepare(sql) {
    const statement = db.prepare(sql)
    let values = []
    return { bind(...args) { values = args; return this }, async first() { return statement.get(...values) ?? null }, async all() { return { success: true, results: statement.all(...values) } }, async run() { return { success: true, meta: statement.run(...values) } } }
  }
  const env = { DB: { prepare, async batch(statements) { db.exec('BEGIN'); try { const result = []; for (const statement of statements) result.push(await statement.all()); db.exec('COMMIT'); return result } catch (error) { db.exec('ROLLBACK'); throw error } } }, ASSETS: { fetch: async () => new Response('asset') }, PASSWORD_PEPPER: 'isolated-test-pepper', GOOGLE_CLIENT_ID: 'test-google', GOOGLE_CLIENT_SECRET: 'test-secret', GITHUB_CLIENT_ID: 'test-github', GITHUB_CLIENT_SECRET: 'test-secret' }
  const { default: worker } = await bundle("export { default } from './worker/index.ts'", { fetch: providerFetch })
  async function request(path, { method = 'GET', data, cookie, origin = 'https://garden.test', host = origin } = {}) {
    return worker.fetch(new Request(host + path, { method, headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: data === undefined ? undefined : JSON.stringify(data) }), env)
  }
  return { request, db, env, close: () => db.close() }
}

export function cookieFrom(response, name = 'dg_session') {
  return response.headers.getSetCookie().find(value => value.startsWith(name + '='))?.split(';')[0]
}
