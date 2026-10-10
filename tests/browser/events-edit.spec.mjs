import { test, expect } from '@playwright/test'

test('Every birthday edits in its original grid cell with a visible calendar choice', async ({ page }) => {
  const events = Array.from({ length: 16 }, (_, index) => ({
    id: `edit-visibility-${index}`,
    title: `可视区域回归${index}生日`,
    date: `1990-${String(Math.floor(index / 2) + 1).padStart(2, '0')}-${index % 2 ? '20' : '10'}`,
    type: 'birthday',
    isLunar: index % 2 === 1,
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
    const originalBounds = await card.boundingBox()
    await card.getByRole('button', { name: '编辑', exact: true }).click()
    await expect(editor.getByPlaceholder('事件名', { exact: true })).toHaveValue(title)
    await expect(grid.locator(':scope > div').nth(index)).toHaveClass(/edit-card-panel/)
    const event = events.find(event => event.title === title)
    await expect(editor).not.toContainText(event.id)
    const calendar = editor.getByRole('radiogroup', { name: '历法' })
    await expect(calendar.getByRole('radio', { name: event.isLunar ? '农历' : '公历', exact: true })).toBeChecked()

    // Measure without scrolling the editor through Playwright: the app must reveal it.
    await expect.poll(() => editor.evaluate((element, original) => {
      const bounds = element.getBoundingClientRect()
      const visible = element.closest('.modal-content').getBoundingClientRect()
      return {
        top: bounds.top, bottom: bounds.bottom, visibleTop: visible.top, visibleBottom: visible.bottom,
        topVisible: bounds.top >= Math.max(0, visible.top) - 1,
        bottomVisible: bounds.bottom <= Math.min(window.innerHeight, visible.bottom) + 1,
        sameColumn: Math.abs(bounds.x - original.x) < 1,
        sameWidth: Math.abs(bounds.width - original.width) < 1,
        noOverflow: element.scrollWidth <= element.clientWidth + 1,
      }
    }, originalBounds), { message: `Editor for card ${index} must stay visible in its original column` }).toMatchObject({ topVisible: true, bottomVisible: true, sameColumn: true, sameWidth: true, noOverflow: true })
    expect(await page.evaluate(() => window.scrollY)).toBe(pageScroll)

    if (index === 0) {
      const selected = calendar.getByRole('radio', { name: event.isLunar ? '农历' : '公历', exact: true })
      await selected.focus()
      await page.keyboard.press('ArrowRight')
      await expect(calendar.getByRole('radio', { name: event.isLunar ? '公历' : '农历', exact: true })).toBeChecked()
      await page.keyboard.press('ArrowRight')
      await expect(selected).toBeChecked()
      await editor.getByRole('button', { name: '💖 纪念日', exact: true }).click()
      await expect(calendar).toBeVisible()
      await editor.getByRole('button', { name: '📅 日程计划', exact: true }).click()
      await expect(calendar).toHaveCount(0)
      await editor.getByRole('button', { name: '🎂 生日', exact: true }).click()
      await expect(selected).toBeChecked()
      await editor.getByPlaceholder('事件名', { exact: true }).fill(title + '已修改')
      await editor.getByRole('button', { name: '保存', exact: true }).click()
      await expect(grid.locator(':scope > div').nth(index).locator('span.font-bold')).toHaveText(title + '已修改')
      const saved = await page.evaluate(id => JSON.parse(localStorage.getItem('daygarden_guest_preferences_v1')).customEvents.find(event => event.id === id), event.id)
      expect(saved.title).toBe(title + '已修改')
      expect(saved.isLunar).toBe(event.isLunar)
    } else {
      await editor.getByRole('button', { name: '取消', exact: true }).click()
      await expect(card.locator('span.font-bold')).toHaveText(title)
    }
    await expect(editor).toHaveCount(0)
  }
})
