import { test, expect } from '@playwright/test'

const city = { name: '上海', province: '上海', lat: 31.23, lon: 121.47 }
test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return
  console.log('Failure geometry:', await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, scrollX, viewport: visualViewport && { width: visualViewport.width, left: visualViewport.offsetLeft, scale: visualViewport.scale }, close: [...document.querySelectorAll('button[aria-label="关闭"]')].map(button => { const r = button.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, hit: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.outerHTML.slice(0, 200) } }) })))
})
test.beforeEach(async ({ page }) => {
  await page.route('https://api.open-meteo.com/**', async route => {
    const temperature = new URL(route.request().url()).searchParams.get('latitude') === String(city.lat) ? 25 : 18
    const dates = ['2026-10-01', '2026-10-02', '2026-10-03']
    await route.fulfill({ json: { daily: { time: dates, weathercode: dates.map(() => 0), temperature_2m_max: dates.map(() => temperature), temperature_2m_min: dates.map(() => 12), apparent_temperature_max: dates.map(() => temperature), apparent_temperature_min: dates.map(() => 12), precipitation_probability_max: dates.map(() => 0), uv_index_max: dates.map(() => 3) } } })
  })
  await page.addInitScript(() => {
    window.cspViolations = []
    document.addEventListener('securitypolicyviolation', event => window.cspViolations.push({ blockedURI: event.blockedURI, directive: event.effectiveDirective }))
  })
})

test('Keyboard and touch sorting persists after reload, and lazy cards display without overflow', async ({ page, isMobile }) => {
  const response = await page.goto('/')
  expect(response.headers()['content-security-policy']).toContain('media-src')
  expect(response.headers()['referrer-policy']).toBe('no-referrer')
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.getByRole('button', { name: '开启排序模式' }).click()
  const move = page.getByRole('button', { name: '下移月历', exact: true })
  if (isMobile) await move.tap()
  else { await move.focus(); await page.keyboard.press('Enter') }
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('daygarden_guest_preferences_v1')).cardOrder[0])).toBe('quickNotes')
  await page.reload()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('daygarden_guest_preferences_v1')).cardOrder[0])).toBe('quickNotes')
  await expect(page.getByRole('article', { name: '月历', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '开启排序模式' }).click()
  await expect(page.getByRole('button', { name: '下移月历', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  expect(errors).toEqual([])
})

test('Invalid imports and impossible dates leave existing preferences intact; valid imports apply immediately', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '布置我的花园 · 设置与个性化' }).click()
  await page.getByRole('button', { name: '提醒与数据备份', exact: true }).click()
  const before = await page.evaluate(() => localStorage.getItem('daygarden_guest_preferences_v1'))
  const dialog = page.waitForEvent('dialog')
  await page.locator('input[type=file]').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ selectedCity: { name: 'bad' } })) })
  const alert = await dialog; expect(alert.message()).toContain('经纬度'); await alert.accept()
  expect(await page.evaluate(() => localStorage.getItem('daygarden_guest_preferences_v1'))).toBe(before)
  const success = page.waitForEvent('dialog')
  await page.locator('input[type=file]').setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 2, preferences: { theme: 'dark', selectedCity: city, customEvents: [], cardOrder: ['calendar', 'calendar'] } })) })
  await (await success).accept()
  await expect(page.locator('html')).toHaveClass(/dark/)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('daygarden_guest_preferences_v1')).cardOrder.filter(id => id === 'calendar').length)).toBe(1)
})

test('Mock sign-in changes account theme and city together; event creation queues offline and synchronizes after reconnect', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '我的花园 · 账户与云端同步' }).click()
  await page.getByRole('button', { name: '模拟 Google 登录', exact: true }).click()
  await expect(page.getByText('Google 绑定', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= visualViewport.width + 1)).toBe(true)
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  const user = (await (await page.request.get('/api/session')).json()).user
  await page.evaluate(({ user, city }) => {
    const key = 'daygarden_user_prefs_' + user.id
    localStorage.setItem(key, JSON.stringify({ theme: 'dark', selectedCity: city, customEvents: [] }))
  }, { user, city })
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByRole('button', { name: '选择或搜索城市' })).toContainText('上海')
  await expect(page.locator('.weather-panel')).toContainText('25')
  await page.locator('.dashboard-card-wrapper').nth(1).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: '添加纪念日' }).click()
  await page.getByPlaceholder('事件名 (如: 妈妈生日)', { exact: true }).fill('浏览器回归生日')
  const date = page.getByPlaceholder('日期 MM-DD (如: 10-08)', { exact: true })
  await date.fill('2026-02-30')
  await page.getByRole('button', { name: '确认添加', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('日期无效')
  await date.fill('10-08')
  await page.route('**/api/events/**', route => route.abort())
  await page.getByRole('button', { name: '确认添加', exact: true }).click()
  await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('daygarden_account_' + id)).pending.length, user.id)).toBeGreaterThan(0)
  await page.unroute('**/api/events/**')
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect.poll(async () => (await (await page.request.get('/api/state')).json()).customEvents.some(event => event.title === '浏览器回归生日')).toBe(true)
  await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('daygarden_account_' + id)).pending.length, user.id)).toBe(0)
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await page.getByRole('button', { name: '云端已同步' }).click()
  await page.getByRole('button', { name: '退出账户', exact: true }).click()
  await expect(page.getByRole('button', { name: '模拟 Google 登录', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.getByRole('button', { name: '选择或搜索城市' })).toContainText('杭州')
  await expect(page.locator('.weather-panel')).toContainText('18')
})

test('Disabled modules do not load their content libraries; loaded poetry remains usable offline', async ({ page, context, isMobile }) => {
  const libraries = []
  page.on('request', request => { if (/assets\/(poetry-curated|seasons-bloom|sports-exercise|health-tips|evidence-guide|inspirational-quotes)/.test(request.url())) libraries.push(request.url()) })
  await page.addInitScript(() => localStorage.setItem('daygarden_guest_preferences_v1', JSON.stringify({ modules: { seasonal: false, dailyPoetry: false, inspirationalQuote: false, evidence: false, sportsExercise: false, healthTip: false } })))
  await page.goto('/')
  await page.locator('.garden-footer').scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: '换一首诗词' })).toHaveCount(0)
  expect(libraries).toEqual([])
  await page.getByRole('button', { name: '布置我的花园 · 设置与个性化' }).click()
  await page.getByRole('button', { name: '提醒与数据备份', exact: true }).click()
  const imported = page.waitForEvent('dialog')
  await page.locator('input[type=file]').setInputFiles({ name: 'enable.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ modules: { dailyPoetry: true } })) })
  await (await imported).accept()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await page.locator('.garden-footer').scrollIntoViewIfNeeded()
  const next = page.getByRole('button', { name: '换一首诗词' })
  await expect(next).toBeVisible()
  const previous = await page.locator('.poetry-work-title').textContent()
  await context.setOffline(true)
  await next.click()
  await expect(page.locator('.poetry-work-title')).not.toHaveText(previous)
  await context.setOffline(false)
  if (isMobile) {
    const overlaps = await page.locator('.dashboard-card-wrapper').evaluateAll(cards => cards.slice(1).some((card, index) => card.getBoundingClientRect().top < cards[index].getBoundingClientRect().bottom - 1))
    expect(overlaps).toBe(false)
  }
})

test('Two accounts and guest apply their own city, weather and theme; an upgrade backup requires explicit recovery', async ({ page }, testInfo) => {
  await page.goto('/')
  const origin = new URL(page.url()).origin
  const legacyId = 'upgrade-' + testInfo.project.name
  const accounts = []
  for (const provider of ['google', 'github']) {
    await page.request.post('/api/auth/mock', { data: { provider }, headers: { Origin: origin } })
    accounts.push((await (await page.request.get('/api/session')).json()).user)
  }
  await page.request.post('/api/logout', { headers: { Origin: origin } })
  await page.evaluate(({ accounts, city, legacyId }) => {
    localStorage.setItem('daygarden_user_prefs_' + accounts[0].id, JSON.stringify({ theme: 'dark', selectedCity: city, customEvents: [{ id: legacyId, title: '旧本机日程', date: '10-09', type: 'birthday' }] }))
    localStorage.setItem('daygarden_user_prefs_' + accounts[1].id, JSON.stringify({ theme: 'light', selectedCity: { name: '北京', province: '北京', lat: 39.9, lon: 116.4 }, customEvents: [] }))
  }, { accounts, city, legacyId })
  await page.getByRole('button', { name: '我的花园 · 账户与云端同步' }).click()
  await page.getByRole('button', { name: '模拟 Google 登录', exact: true }).click()
  await expect(page.getByRole('button', { name: '合并旧本机日程', exact: true })).toBeVisible()
  expect((await (await page.request.get('/api/state')).json()).customEvents.some(event => event.id === legacyId)).toBe(false)
  await page.getByRole('button', { name: '合并旧本机日程', exact: true }).click()
  await expect.poll(async () => (await (await page.request.get('/api/state')).json()).customEvents.some(event => event.id === legacyId)).toBe(true)
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByRole('button', { name: '选择或搜索城市' })).toContainText('上海')
  await expect(page.locator('.weather-panel')).toContainText('25')
  await page.getByRole('button', { name: '云端已同步' }).click()
  await page.getByRole('button', { name: '退出账户', exact: true }).click()
  await page.getByRole('button', { name: '模拟 GitHub 登录', exact: true }).click()
  await expect(page.getByText('GitHub 绑定', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expect(page.getByRole('button', { name: '选择或搜索城市' })).toContainText('北京')
  await expect(page.locator('.weather-panel')).toContainText('18')
})

test('Header and calendar stay on the same local date across midnight', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-01T23:59:50+08:00') })
  await page.goto('/')
  await expect(page.locator('.cal-cell.is-today .cell-solar-num')).toHaveText('1')
  await page.clock.fastForward(40000)
  await expect(page.locator('.cal-cell.is-today .cell-solar-num')).toHaveText('2')
  await expect(page.locator('.date-card')).toContainText('2')
})

test('Production CSP permits overseas geocoding, provider avatars and all radio hosts', async ({ page }) => {
  await page.route('https://geocoding-api.open-meteo.com/**', route => route.fulfill({ json: { results: [{ name: 'Paris', country: 'France', admin1: 'Île-de-France', latitude: 48.85, longitude: 2.35 }] } }))
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3X8AAAAASUVORK5CYII=', 'base64')
  await page.route(/https:\/\/(.*googleusercontent\.com|avatars\.githubusercontent\.com|images\.unsplash\.com)\//, route => route.fulfill({ contentType: 'image/png', body: png }))
  const wav = Buffer.alloc(16044)
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40)
  await page.route(/https:\/\/(ice1\.somafm\.com|.*radiohost\.de)\//, route => route.fulfill({ contentType: 'audio/wav', body: wav }))
  // Playwright intercepts only the first request in a redirect chain. Test
  // the public URL and its verified final host separately with valid audio.
  await page.route('https://listen.reyfm.de/**', route => route.fulfill({ contentType: 'audio/wav', body: wav }))
  await page.goto('/')
  await page.getByRole('button', { name: '选择或搜索城市' }).click()
  await page.getByPlaceholder('搜索任意城市（如：苏州、三亚、青岛…）').fill('Paris')
  await expect(page.getByRole('button', { name: /Paris/ })).toBeVisible()
  const results = await page.evaluate(async () => {
    const urls = ['https://lh3.googleusercontent.com/test.png', 'https://avatars.githubusercontent.com/test.png', 'https://images.unsplash.com/test.png', 'https://listen.reyfm.de/lofi_320kbps.mp3', 'https://reyfm.stream17.radiohost.de/reyfm-lofi', 'https://ice1.somafm.com/dronezone-128-mp3', 'https://ice1.somafm.com/groovesalad-128-mp3']
    return Promise.all(urls.map(url => new Promise(resolve => {
      const resource = url.endsWith('.png') ? new Image() : new Audio()
      resource.onload = resource.onloadedmetadata = () => { resolve({ url, ok: true }); if (resource instanceof HTMLMediaElement) { resource.pause(); resource.removeAttribute('src'); resource.load() } }
      resource.onerror = () => resolve({ url, ok: false })
      resource.src = url
    })))
  })
  expect(results.filter(result => !result.ok)).toEqual([])
  expect(await page.evaluate(() => window.cspViolations)).toEqual([])
})
