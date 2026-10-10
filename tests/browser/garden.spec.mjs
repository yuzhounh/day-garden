import { test, expect } from '@playwright/test'
import { enableSorting, expectSelectedCity, openAccount, openCityPicker, openSettings, selectCity } from './navigation.mjs'

const city = { name: '上海', province: '上海', lat: 31.23, lon: 121.47 }
test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return
  console.log('Failure geometry:', await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, scrollX, viewport: visualViewport && { width: visualViewport.width, left: visualViewport.offsetLeft, scale: visualViewport.scale }, close: [...document.querySelectorAll('button[aria-label="关闭"]')].map(button => { const r = button.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, hit: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.outerHTML.slice(0, 200) } }) })))
})
test.beforeEach(async ({ page, context }, info) => {
  if (/^(Mock sign-in|Favorite controls|Account city defaults|Two accounts)/.test(info.title)) {
    await page.route('**/api/auth/providers', async route => {
      const response = await route.fetch()
      await route.fulfill({ response, json: { ...await response.json(), google: true } })
    })
    await context.route('**/api/auth/google?*', async route => {
      const url = new URL(route.request().url())
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) throw new Error('OAuth fixture must remain local')
      const payload = JSON.stringify({ type: 'daygarden-oauth-success', provider: 'google', attempt: url.searchParams.get('attempt') })
      await route.fulfill({ contentType: 'text/html', body: `<!doctype html><script>
        fetch('/api/auth/mock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'google' }) })
          .then(response => { if (!response.ok) throw new Error('Local mock authentication failed'); window.opener.postMessage(${payload}, location.origin); setTimeout(() => window.close(), 100); });
      </script>` })
    })
  }
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
  await enableSorting(page)
  const move = page.getByRole('button', { name: '下移月历', exact: true })
  if (isMobile) await move.tap()
  else { await move.focus(); await page.keyboard.press('Enter') }
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('daygarden_guest_preferences_v1')).cardOrder[0])).toBe('quickNotes')
  await page.reload()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('daygarden_guest_preferences_v1')).cardOrder[0])).toBe('quickNotes')
  await expect(page.getByRole('article', { name: '月历', exact: true })).toBeVisible()
  await enableSorting(page)
  await expect(page.getByRole('button', { name: '下移月历', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  expect(errors).toEqual([])
})

test('Invalid imports and impossible dates leave existing preferences intact; valid imports apply immediately', async ({ page }) => {
  await page.goto('/')
  await openSettings(page)
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
  await openAccount(page)
  await page.getByRole('button', { name: '使用 Google 账户登录', exact: true }).click()
  await expect(page.getByRole('button', { name: '退出账户', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= visualViewport.width + 1)).toBe(true)
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  const user = (await (await page.request.get('/api/session')).json()).user
  await page.evaluate(({ user, city }) => {
    const key = 'daygarden_user_prefs_' + user.id
    localStorage.setItem(key, JSON.stringify({ theme: 'dark', selectedCity: city, customEvents: [] }))
  }, { user, city })
  await page.request.put('/api/city', { data: city, headers: { Origin: new URL(page.url()).origin } })
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expectSelectedCity(page, '上海')
  await expect(page.locator('.weather-panel')).toContainText('25')
  await page.locator('.lazy-card', { hasText: '岁月里程' }).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: '添加重要日子与日程' }).click()
  const addBtn = page.getByRole('button', { name: '添加日程、生日或纪念日' })
  await expect(addBtn).toBeVisible()
  await expect(addBtn).not.toHaveClass(/active/)
  await expect(addBtn.locator('svg')).not.toHaveClass(/rotate/)
  await addBtn.click()
  const collapseBtn = page.getByRole('button', { name: '收起新增面板' })
  await expect(collapseBtn).toBeVisible()
  await expect(collapseBtn.locator('svg')).not.toHaveClass(/rotate/)
  await page.getByPlaceholder('寿星姓名/事件 (如: 妈妈生日)', { exact: true }).fill('浏览器回归生日')
  const date = page.getByPlaceholder('日期 MM-DD 或 YYYY-MM-DD', { exact: true })
  await date.fill('2026-02-30')
  await page.getByRole('button', { name: '确认添加', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('日期无效')
  await date.fill('10-08')
  await page.route('**/api/events/**', route => route.abort())
  await page.getByRole('button', { name: '确认添加', exact: true }).click()
  await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('daygarden_account_' + id)).pending.length, user.id)).toBeGreaterThan(0)
  await page.waitForTimeout(500)
  await page.unroute('**/api/events/**')
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect.poll(async () => (await (await page.request.get('/api/state')).json()).customEvents.some(event => event.title === '浏览器回归生日'), { timeout: 15000 }).toBe(true)
  await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('daygarden_account_' + id)).pending.length, user.id), { timeout: 15000 }).toBe(0)
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await openAccount(page, { synced: true })
  await page.getByRole('button', { name: '退出账户', exact: true }).click()
  await expect(page.getByRole('button', { name: '使用 Google 账户登录', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expectSelectedCity(page, '北京')
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
  await openSettings(page)
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

test('Favorite controls stay hidden for guests and appear after login', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('daygarden_guest_data', JSON.stringify({ savedPoetry: ['dumu-shanxing'], dailyActions: {}, pending: [], eventsInitialized: false })))
  await page.goto('/')
  for (const card of await page.locator('.dashboard-card-wrapper').all()) {
    await card.scrollIntoViewIfNeeded()
    await page.waitForTimeout(100)
  }
  await expect(page.locator('.poetry-work-title')).toBeVisible()
  const guest = await page.evaluate(() => localStorage.getItem('daygarden_guest_data'))
  const bookmark = page.locator('.poetry-card .inline-actions button[aria-pressed]')
  await expect(bookmark).toHaveCount(0)
  const previous = await page.locator('.poetry-work-title').textContent()
  await page.getByRole('button', { name: '换一首诗词' }).click()
  await expect(page.locator('.poetry-work-title')).not.toHaveText(previous)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.locator('.poetry-card').getByRole('button', { name: '品读全篇', exact: true }).click()
  await expect(page.locator('.full-poem')).toBeVisible()
  await expect(page.getByRole('button', { name: /收藏这首诗|已收藏 · 点击取消/ })).toHaveCount(0)
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await page.getByRole('button', { name: '诗词小集', exact: true }).click()
  await page.getByPlaceholder('搜索诗词名句、诗人、诗名或随想...').fill('山行')
  const poem = page.locator('.quote-item-card')
  await expect(poem).toHaveCount(1)
  await expect(poem.getByRole('button', { name: /收藏/ })).toHaveCount(0)
  await expect(page.locator('.filter-pills').getByRole('button', { name: '收藏', exact: true })).toHaveCount(0)
  await poem.getByRole('button', { name: '品读全篇', exact: true }).click()
  await expect(poem.locator('.full-poem')).toBeVisible()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  expect(await page.evaluate(() => localStorage.getItem('daygarden_guest_data'))).toBe(guest)
  await openAccount(page)
  await page.getByRole('button', { name: '使用 Google 账户登录', exact: true }).click()
  await expect(page.getByRole('button', { name: '退出账户', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(bookmark).toBeVisible()
  if (await page.locator('.poetry-work-title').textContent() === '《山行》') await page.getByRole('button', { name: '换一首诗词' }).click()
  const wasSaved = await bookmark.getAttribute('aria-pressed')
  await bookmark.click()
  await expect(bookmark).toHaveAttribute('aria-pressed', wasSaved === 'true' ? 'false' : 'true')
  await page.locator('.poetry-card').getByRole('button', { name: '品读全篇', exact: true }).click()
  await expect(page.getByRole('button', { name: /收藏这首诗|已收藏 · 点击取消/ })).toBeVisible()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await page.getByRole('button', { name: '诗词小集', exact: true }).click()
  await page.getByPlaceholder('搜索诗词名句、诗人、诗名或随想...').fill('山行')
  await expect(poem.getByRole('button', { name: '已收藏', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await (await page.request.get('/api/state')).json()).savedPoetry.includes('dumu-shanxing')).toBe(true)
  await page.locator('.filter-pills').getByRole('button', { name: '收藏', exact: true }).click()
  await expect(poem).toHaveCount(1)
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  await openAccount(page, { synced: true })
  await page.getByRole('button', { name: '退出账户', exact: true }).click()
  await expect(page.getByRole('button', { name: '使用 Google 账户登录', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(bookmark).toHaveCount(0)
  await page.getByRole('button', { name: '诗词小集', exact: true }).click()
  await expect(page.locator('.filter-pills').getByRole('button', { name: '收藏', exact: true })).toHaveCount(0)
  await expect(page.locator('.quote-item-card').getByRole('button', { name: /收藏/ })).toHaveCount(0)
})

test('Account city defaults to Beijing, adopts the guest choice and restores from cloud after cache removal', async ({ page }, testInfo) => {
  await page.goto('/')
  await expectSelectedCity(page, '北京')
  await selectCity(page, '上海')
  await expectSelectedCity(page, '上海')
  await openAccount(page)
  await page.getByRole('button', { name: '邮箱与密码', exact: true }).click()
  const email = 'city' + testInfo.project.name + '@example.com'
  const password = 'GardenBrowserTest2026'
  await page.getByRole('button', { name: '创建账户', exact: true }).click()
  await page.locator('#garden-username').fill(email)
  await page.locator('#garden-password').fill(password)
  await page.locator('#garden-password-confirmation').fill(password)
  await page.getByRole('button', { name: '创建账户并登录', exact: true }).click()
  await expect(page.getByRole('button', { name: '退出账户', exact: true })).toBeVisible()
  await expect.poll(async () => (await (await page.request.get('/api/state')).json()).selectedCity?.name).toBe('上海')
  const user = (await (await page.request.get('/api/session')).json()).user
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expectSelectedCity(page, '上海')
  await selectCity(page, '广州')
  await expect.poll(async () => (await (await page.request.get('/api/state')).json()).selectedCity?.name).toBe('广州')
  await openAccount(page, { synced: true })
  await page.getByRole('button', { name: '退出账户', exact: true }).click()
  await expect(page.getByRole('button', { name: '使用 Google 账户登录', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expectSelectedCity(page, '上海')
  await selectCity(page, '北京')
  await page.evaluate(id => { localStorage.removeItem('daygarden_user_prefs_' + id); localStorage.removeItem('daygarden_account_' + id) }, user.id)
  await page.reload()
  await expectSelectedCity(page, '北京')
  await openAccount(page)
  await page.getByRole('button', { name: '邮箱与密码', exact: true }).click()
  await page.locator('#garden-username').fill(email)
  await page.locator('#garden-password').fill(password)
  await page.getByRole('button', { name: '登录并同步', exact: true }).click()
  await expect(page.getByRole('button', { name: '退出账户', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expectSelectedCity(page, '广州')
})

test('Login methods separate Google from email registration and password login', async ({ page }, testInfo) => {
  await page.goto('/')
  await openAccount(page)
  await expect(page.getByText('无需单独注册，首次登录会自动创建账户。')).toBeVisible()
  await expect(page.locator('#garden-username')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /GitHub/ })).toHaveCount(0)
  await page.locator('.account-modal').screenshot({ path: `tmp/account-google-${testInfo.project.name}.png` })
  await page.getByRole('button', { name: '邮箱与密码', exact: true }).click()
  await expect(page.getByRole('button', { name: '使用 Google 账户登录', exact: true })).toHaveCount(0)
  await expect(page.locator('#garden-password-confirmation')).toHaveCount(0)
  await page.locator('.account-modal').screenshot({ path: `tmp/account-email-${testInfo.project.name}.png` })
  await page.getByRole('button', { name: '创建账户', exact: true }).click()
  const email = `flow${testInfo.project.name}@example.com`
  const password = 'GardenBrowserTest2026'
  await page.locator('#garden-username').fill(email)
  await page.locator('#garden-password').fill(password)
  await page.locator('#garden-password-confirmation').fill('DifferentPassword2026')
  await page.getByRole('button', { name: '创建账户并登录', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('两次输入的密码不一致，请重新确认。')
  await page.locator('#garden-password-confirmation').fill(password)
  await page.getByRole('button', { name: '创建账户并登录', exact: true }).click()
  await expect(page.getByRole('button', { name: '退出账户', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '退出账户', exact: true }).click()
  await page.locator('#garden-username').fill(email)
  await page.locator('#garden-password').fill(password)
  await page.getByRole('button', { name: '登录并同步', exact: true }).click()
  await expect(page.getByRole('button', { name: '退出账户', exact: true })).toBeVisible()
})

test('Two accounts and guest apply their own city, weather and theme; an upgrade backup requires explicit recovery', async ({ page }, testInfo) => {
  await page.goto('/')
  const origin = new URL(page.url()).origin
  const legacyId = 'upgrade-' + testInfo.project.name
  const accounts = []
  await page.request.post('/api/auth/mock', { data: { provider: 'google' }, headers: { Origin: origin } })
  accounts.push((await (await page.request.get('/api/session')).json()).user)
  await page.request.put('/api/city', { data: city, headers: { Origin: origin } })
  const passwordUsername = 'prefs' + testInfo.project.name
  const password = 'GardenBrowserTest2026'
  const registration = await page.request.post('/api/register', { data: { username: passwordUsername, password }, headers: { Origin: origin } })
  expect(registration.ok()).toBe(true)
  accounts.push((await registration.json()).user)
  await page.request.put('/api/city', { data: { name: '北京', province: '北京', lat: 39.9, lon: 116.4 }, headers: { Origin: origin } })
  await page.request.post('/api/logout', { headers: { Origin: origin } })
  await page.evaluate(({ accounts, city, legacyId }) => {
    localStorage.setItem('daygarden_user_prefs_' + accounts[0].id, JSON.stringify({ theme: 'dark', selectedCity: city, customEvents: [{ id: legacyId, title: '旧本机日程', date: '10-09', type: 'birthday' }] }))
    localStorage.setItem('daygarden_user_prefs_' + accounts[1].id, JSON.stringify({ theme: 'light', selectedCity: { name: '北京', province: '北京', lat: 39.9, lon: 116.4 }, customEvents: [] }))
  }, { accounts, city, legacyId })
  await openAccount(page)
  await expect(page.getByRole('button', { name: /GitHub/ })).toHaveCount(0)
  await page.getByRole('button', { name: '使用 Google 账户登录', exact: true }).click()
  await expect(page.getByRole('button', { name: '合并旧本机日程', exact: true })).toBeVisible()
  expect((await (await page.request.get('/api/state')).json()).customEvents.some(event => event.id === legacyId)).toBe(false)
  await page.getByRole('button', { name: '合并旧本机日程', exact: true }).click()
  await expect.poll(async () => (await (await page.request.get('/api/state')).json()).customEvents.some(event => event.id === legacyId)).toBe(true)
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expectSelectedCity(page, '上海')
  await expect(page.locator('.weather-panel')).toContainText('25')
  await openAccount(page, { synced: true })
  await page.getByRole('button', { name: '退出账户', exact: true }).click()
  await page.getByRole('button', { name: '邮箱与密码', exact: true }).click()
  await page.locator('#garden-username').fill(passwordUsername)
  await page.locator('#garden-password').fill(password)
  await page.getByRole('button', { name: '登录并同步', exact: true }).click()
  await expect(page.getByRole('button', { name: '退出账户', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await expectSelectedCity(page, '北京')
  await expect(page.locator('.weather-panel')).toContainText('18')
})

test('Header and calendar stay on the same local date across midnight', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-01T23:59:50+08:00') })
  await page.goto('/')
  const calendarCard = page.locator('.month-calendar-card')
  await calendarCard.scrollIntoViewIfNeeded()
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
  const cityPicker = await openCityPicker(page)
  await cityPicker.getByRole('textbox').fill('Paris')
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

test('Calendar legend stays side-by-side without clipping or overlap on desktop and mobile', async ({ page }) => {
  await page.goto('/')
  await page.locator('.lazy-card').filter({ has: page.locator('.month-calendar-card, [aria-label="月历"]') }).scrollIntoViewIfNeeded()
  const legendItems = page.locator('.cal-legend .legend-item')
  await expect(legendItems).toHaveCount(2)
  await expect(legendItems.nth(0)).toContainText('放假')
  await expect(legendItems.nth(1)).toContainText('调休')

  const boxes = await Promise.all([
    legendItems.nth(0).boundingBox(),
    legendItems.nth(1).boundingBox(),
  ])
  expect(boxes[0]).not.toBeNull()
  expect(boxes[1]).not.toBeNull()

  expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(5)
  expect(boxes[1].x).toBeGreaterThanOrEqual(boxes[0].x + boxes[0].width)
  const card = await page.locator('.month-calendar-card').boundingBox()
  for (const box of boxes) {
    expect(box.x).toBeGreaterThanOrEqual(card.x)
    expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width)
  }
})

test('Calendar footer hides the holiday in a narrow card and restores it when the card widens', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-04T12:00:00+08:00') })
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.goto('/')
  const calendarCard = page.locator('.month-calendar-card')
  await page.locator('.lazy-card').filter({ has: page.locator('.month-calendar-card, [aria-label="月历"]') }).scrollIntoViewIfNeeded()
  await calendarCard.scrollIntoViewIfNeeded()

  // Fix both the date and selected cell so the test does not depend on the CI month.
  await calendarCard.locator('.cal-cell:not(.other-month)').filter({ has: page.locator('.cell-solar-num', { hasText: /^4$/ }) }).click()

  const solar = calendarCard.locator('.detail-solar')
  const lunar = calendarCard.locator('.detail-lunar')
  const extra = calendarCard.locator('.detail-extra')
  const legendItems = calendarCard.locator('.cal-legend .legend-item')

  await expect(solar).toBeVisible()
  await expect(lunar).toBeVisible()
  await expect(solar).toHaveText('2026年10月4日')
  await expect(extra).toHaveText('国庆节 (放假)')
  await expect(legendItems).toHaveCount(2)

  for (const width of [820, 1440, 820]) {
    await page.setViewportSize({ width, height: 1180 })
    if (width === 820) await expect(extra).toBeHidden()
    else await expect(extra).toBeVisible()
    await expect(solar).toBeVisible()
    await expect(lunar).toBeVisible()
    await expect(legendItems.nth(0)).toBeVisible()
    await expect(legendItems.nth(1)).toBeVisible()
    await expect.poll(() => calendarCard.locator('.cal-footer').evaluate(footer => {
      const bounds = footer.getBoundingClientRect()
      const items = [...footer.querySelectorAll('.detail-solar, .detail-lunar, .detail-extra, .legend-item')]
        .filter(item => item.getClientRects().length).map(item => item.getBoundingClientRect())
      return items.every((item, index) => item.left >= bounds.left - 1 && item.right <= bounds.right + 1 &&
        Math.abs(item.y - items[0].y) < 6 && (!index || item.left >= items[index - 1].right - 1))
    })).toBe(true)
  }
})

test('Attractions status buttons display side-by-side on wide desktop and stacked into two lines on mobile and tablet', async ({ page, isMobile }) => {
  await page.goto('/')
  const card = page.locator('.lazy-card', { hasText: '华夏胜景' })
  await card.scrollIntoViewIfNeeded()
  const firstSpot = page.locator('.spot-mini-row').first()
  await expect(firstSpot).toBeVisible()
  const buttons = firstSpot.locator('.spot-actions-group .status-btn')
  await expect(buttons).toHaveCount(2)
  await expect(buttons.nth(0)).toContainText('去过')
  await expect(buttons.nth(1)).toContainText('想去')

  const boxes = await Promise.all([
    buttons.nth(0).boundingBox(),
    buttons.nth(1).boundingBox(),
  ])
  expect(boxes[0]).not.toBeNull()
  expect(boxes[1]).not.toBeNull()

  if (isMobile) {
    expect(boxes[1].y).toBeGreaterThan(boxes[0].y + 15)
  } else {
    expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(5)
    expect(boxes[1].x).toBeGreaterThan(boxes[0].x + 30)

    await page.setViewportSize({ width: 820, height: 1180 })
    await firstSpot.scrollIntoViewIfNeeded()
    const tabletBoxes = await Promise.all([
      buttons.nth(0).boundingBox(),
      buttons.nth(1).boundingBox(),
    ])
    expect(tabletBoxes[1].y).toBeGreaterThan(tabletBoxes[0].y + 15)
  }
})

test('Attractions card displays spot name and location tag in two separate lines on tablet', async ({ page, isMobile }) => {
  if (isMobile) return
  await page.goto('/')
  await page.setViewportSize({ width: 820, height: 1180 })
  const card = page.locator('.lazy-card', { hasText: '华夏胜景' })
  await card.scrollIntoViewIfNeeded()
  const firstSpot = page.locator('.spot-mini-row').first()
  await expect(firstSpot).toBeVisible()

  const name = firstSpot.locator('.spot-title-row strong')
  const loc = firstSpot.locator('.spot-title-row .spot-location-tag')
  await expect(name).toBeVisible()
  await expect(loc).toBeVisible()

  const [nameBox, locBox] = await Promise.all([
    name.boundingBox(),
    loc.boundingBox(),
  ])
  expect(nameBox).not.toBeNull()
  expect(locBox).not.toBeNull()

  // 分两行排版：loc 的 y 坐标明显大于 name 的 y 坐标
  expect(locBox.y).toBeGreaterThan(nameBox.y + nameBox.height - 4)
})

test('Garden audio card shrinks vinyl disc, places sound wave bars above text, and displays timer popover on tablet', async ({ page, isMobile }) => {
  if (isMobile) return
  await page.goto('/')
  await page.setViewportSize({ width: 820, height: 1180 })
  const card = page.locator('.lazy-card', { hasText: '听见花园' })
  await card.scrollIntoViewIfNeeded()

  // 1. 唱片缩小 (<= 110px)
  const disc = card.locator('.vinyl-disc')
  await expect(disc).toBeVisible()
  const discBox = await disc.boundingBox()
  expect(discBox).not.toBeNull()
  expect(discBox.width).toBeLessThan(120)

  // 2. 律动波形在歌曲名与副标题文字上方
  const waveBars = card.locator('.sound-wave-bars')
  const trackTitle = card.locator('.vinyl-track-title')
  await expect(waveBars).toBeVisible()
  await expect(trackTitle).toBeVisible()
  const [waveBox, titleBox] = await Promise.all([
    waveBars.boundingBox(),
    trackTitle.boundingBox(),
  ])
  expect(waveBox).not.toBeNull()
  expect(titleBox).not.toBeNull()
  expect(waveBox.y).toBeLessThan(titleBox.y)

  // 3. 定时选项弹出菜单
  const desktopPills = card.locator('.desktop-timer-group')
  await expect(desktopPills).toBeHidden()
  const dropdownBtn = card.locator('.timer-dropdown-btn')
  await expect(dropdownBtn).toBeVisible()
  await expect(dropdownBtn).toContainText('定时')

  // 点击定时按钮，弹出窗口
  await dropdownBtn.click()
  const popoverMenu = card.locator('.timer-popover-menu')
  await expect(popoverMenu).toBeVisible()
  const popoverItems = popoverMenu.locator('.timer-popover-item')
  await expect(popoverItems).toHaveCount(4)
  await expect(popoverItems.nth(0)).toContainText('不限时')
  await expect(popoverItems.nth(1)).toContainText('15分')

  // 点击 15分
  await popoverItems.nth(1).click()
  await expect(popoverMenu).toBeHidden()
  await expect(dropdownBtn).toContainText('15分')
})


test('Insight and reading callouts unify icon and text layout with top-aligned icon and hanging indent', async ({ page }) => {
  await page.goto('/')
  // 1. Poetry reading
  const poetryCard = page.locator('.lazy-card', { hasText: '今日诗笺' })
  await poetryCard.scrollIntoViewIfNeeded()
  const poetryReading = page.locator('.poetry-reading').first()
  await expect(poetryReading).toBeVisible()
  const poetryIcon = poetryReading.locator('.poetry-reading-icon')
  const poetryText = poetryReading.locator('p')

  // 2. Quote insight
  const quoteCard = page.locator('.lazy-card', { hasText: '名言语录' })
  await quoteCard.scrollIntoViewIfNeeded()
  const quoteInsight = page.locator('.quote-insight').first()
  await expect(quoteInsight).toBeVisible()
  const quoteIcon = quoteInsight.locator('.quote-insight-icon')
  const quoteText = quoteInsight.locator('p')

  // 3. Sport insight
  const sportCard = page.locator('.lazy-card', { hasText: '动健身心' })
  await sportCard.scrollIntoViewIfNeeded()
  const sportInsight = page.locator('.sport-insight-box').first()
  await expect(sportInsight).toBeVisible()
  const sportIcon = sportInsight.locator('.sport-insight-icon')
  const sportText = sportInsight.locator('.sport-insight-text')

  for (const [icon, text] of [[poetryIcon, poetryText], [quoteIcon, quoteText], [sportIcon, sportText]]) {
    const iconBox = await icon.boundingBox()
    const textBox = await text.boundingBox()
    expect(iconBox).not.toBeNull()
    expect(textBox).not.toBeNull()
    // Icon is top-aligned with the first line of text
    expect(Math.abs(iconBox.y - textBox.y)).toBeLessThan(6)
    // Text is in its own column on the right (hanging indent)
    expect(textBox.x).toBeGreaterThanOrEqual(iconBox.x + iconBox.width + 4)
  }
})

test('Wellbeing tip banner pill is vertically centered with the tip text', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('.lazy-card', { hasText: '好好照顾自己' })
  await card.scrollIntoViewIfNeeded()
  const banner = page.locator('.wellbeing-tip-banner')
  await expect(banner).toBeVisible()
  const pill = banner.locator('.pill')
  const text = banner.locator('.wellbeing-tip-text')

  const pillBox = await pill.boundingBox()
  const textBox = await text.boundingBox()
  expect(pillBox).not.toBeNull()
  expect(textBox).not.toBeNull()

  const pillCenterY = pillBox.y + pillBox.height / 2
  const textCenterY = textBox.y + textBox.height / 2
  expect(Math.abs(pillCenterY - textCenterY)).toBeLessThan(4)
})

test('Vinyl record displays adaptive obsidian black disc in light mode and porcelain white disc in dark mode without harsh bullseye rings', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('.lazy-card', { hasText: '听见花园' })
  await card.scrollIntoViewIfNeeded()
  const disc = page.locator('.vinyl-disc')
  await expect(disc).toBeVisible()

  // In light mode, the disc has obsidian black base gradient
  const lightBg = await disc.evaluate((el) => window.getComputedStyle(el).backgroundImage)
  expect(lightBg).toContain('rgb(46, 52, 59)')

  // Switch to dark mode
  await page.evaluate(() => document.documentElement.classList.add('dark'))
  const darkBg = await disc.evaluate((el) => window.getComputedStyle(el).backgroundImage)
  expect(darkBg).toContain('rgb(246, 248, 246)')

  // Verify groove ring border is subtle translucent instead of solid stark white
  const ring1 = page.locator('.vinyl-groove-ring.ring-1')
  const ring1Border = await ring1.evaluate((el) => window.getComputedStyle(el).borderColor)
  expect(ring1Border).not.toBe('rgb(255, 255, 255)')
})

