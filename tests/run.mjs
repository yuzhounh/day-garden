import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { createServer } from 'node:net'
import { randomUUID } from 'node:crypto'

const root = resolve(import.meta.dirname, '..')
const tmpRoot = resolve(root, 'tmp')
const { mkdirSync } = await import('node:fs')
mkdirSync(tmpRoot, { recursive: true })
const sandbox = mkdtempSync(resolve(tmpRoot, 'regression-'))
if (!sandbox.startsWith(tmpRoot + sep)) throw new Error('Invalid test directory')
const wrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js')
const environment = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' }
let server
let log = ''
async function run(args, cwd = root, env = environment) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit', windowsHide: true })
  const [code] = await once(child, 'exit')
  if (code !== 0) throw new Error(`Test command exited with ${code}: ${args.join(' ')}`)
}
async function freePort() {
  const socket = createServer().listen(0, '127.0.0.1')
  await once(socket, 'listening')
  const port = socket.address().port
  await new Promise(resolve => socket.close(resolve))
  return port
}
async function stopServer() {
  if (!server || server.exitCode !== null) return
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })
    await once(killer, 'exit')
  } else {
    const exited = once(server, 'exit')
    server.kill('SIGTERM')
    await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 3000))])
    if (server.exitCode === null) { server.kill('SIGKILL'); await exited }
  }
}
try {
  await run(['--test', 'tests/regressions.test.mjs', 'tests/oauth.test.mjs', 'tests/scene.test.mjs', 'tests/weather-insights.test.mjs'])
  const config = resolve(sandbox, 'wrangler.json')
  const databaseId = randomUUID()
  writeFileSync(config, JSON.stringify({ name: 'day-garden-test', pages_build_output_dir: resolve(root, 'dist'), compatibility_date: '2026-09-30', vars: { PASSWORD_PEPPER: 'isolated-test-pepper' }, d1_databases: [{ binding: 'DB', database_name: 'day-garden-test', database_id: databaseId, migrations_dir: resolve(root, 'worker/migrations') }] }, null, 2))
  const persistence = resolve(sandbox, 'state')
  await run([wrangler, 'd1', 'migrations', 'apply', 'day-garden-test', '--local', '--persist-to', persistence, '--config', config], sandbox)
  const port = await freePort()
  const base = `http://127.0.0.1:${port}`
  server = spawn(process.execPath, [wrangler, 'pages', 'dev', resolve(root, 'dist'), '--d1', 'DB=' + databaseId, '--binding', 'PASSWORD_PEPPER=isolated-test-pepper', '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', String(await freePort()), '--persist-to', persistence, '--show-interactive-dev-session=false'], { cwd: sandbox, env: environment, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
  server.stdout.on('data', chunk => { log = (log + chunk).slice(-8000) })
  server.stderr.on('data', chunk => { log = (log + chunk).slice(-8000) })
  let ready = false
  for (const deadline = Date.now() + 45000; Date.now() < deadline;) {
    if (server.exitCode !== null) throw new Error('Test server stopped: ' + log)
    try { const response = await fetch(base + '/api/health', { signal: AbortSignal.timeout(1000) }); ready = response.ok; if (ready) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  if (!ready) throw new Error('Test server did not become ready: ' + log)
  const testEnv = { ...environment, TEST_BASE_URL: base }
  await run(['tests/api.mjs'], root, testEnv)
  // Start browser authentication flows without the API rate-limit test's exhausted counter.
  await run([wrangler, 'd1', 'execute', 'day-garden-test', '--local', '--persist-to', persistence, '--config', config, '--command', 'DELETE FROM auth_attempts'], sandbox)
  await run([resolve(root, 'node_modules/@playwright/test/cli.js'), 'test', ...process.argv.slice(2)], root, testEnv)
  console.log('All regression checks passed; only the isolated test database was used.')
} catch (error) {
  console.error(log)
  throw error
} finally {
  await stopServer()
  rmSync(sandbox, { recursive: true, force: true })
}
