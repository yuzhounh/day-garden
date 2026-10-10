import { test, expect } from '@playwright/test'

test('Every birthday editor stays inside the visible modal after the grid reflows', async ({ page }) => {
  const events = Array.from({ length: 16 }, (_, index) => ({
    id: `edit-visibility-${index}`,
    title: `可视区域回归${index}生日`,
    date: `1990-${String(Math.floor(index / 2) + 1).padStart(2, '0')}-${index % 2 ? '20' : '10'}`,
    type: 'birthday',
  }))
  await page.addInitScript(events => {
    localStorage.setItem('daygarden_guest_preferences_v1', JSON.stringify({ customEvents: events }))
  }, events)
  await page.route('**/api/session', route => route.fulfill({ json: { user: null } }))
  await page.route('**/api/auth/providers', route => route.fulfill({ json: { google: false, github: false, dev: false } }))
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { daily: { time: [] } } }))
  await page.goto('/')
  await page.locator('.lazy-card', { hasText: '岁月里程' }).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: '管理重要日子与日程', exact: true }).click()

  const modal = page.getByRole('dialog', { name: '岁月里程 · 重要日子与日程' })
  const grid = modal.locator('.grid').filter({ has: page.getByRole('button', { name: '编辑', exact: true }) }).last()
  const editor = modal.locator('.edit-card-panel')
  await expect(grid.locator(':scope > div')).toHaveCount(events.length)
  const pageScroll = await page.evaluate(() => window.scrollY)

  // Start with the last right-hand card, then exercise both columns and every row.
  for (let index = events.length - 1; index >= 0; index--) {
    const card = grid.locator(':scope > div').nth(index)
    const title = (await card.locator('span.font-bold').textContent()).trim()
    await card.scrollIntoViewIfNeeded()
    await card.getByRole('button', { name: '编辑', exact: true }).click()
    await expect(editor.getByPlaceholder('事件名', { exact: true })).toHaveValue(title)

    // Measure without scrolling the editor through Playwright: the app must reveal it.
    await expect.poll(() => editor.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      const visible = element.closest('.modal-content').getBoundingClientRect()
      return {
        top: bounds.top, bottom: bounds.bottom, visibleTop: visible.top, visibleBottom: visible.bottom,
        topVisible: bounds.top >= Math.max(0, visible.top) - 1,
        bottomVisible: bounds.bottom <= Math.min(window.innerHeight, visible.bottom) + 1,
      }
    }), { message: `Editor for card ${index} must be fully visible` }).toMatchObject({ topVisible: true, bottomVisible: true })
    expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll)
    await editor.getByRole('button', { name: '取消', exact: true }).click()
    await expect(editor).toHaveCount(0)
  }
})
