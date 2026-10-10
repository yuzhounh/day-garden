import { test, expect } from '@playwright/test'

test('New birthdays use the same solar/lunar choice as editing and save the selected calendar', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('daygarden_guest_preferences_v1', JSON.stringify({ customEvents: [] }))
  })
  await page.route('**/api/session', route => route.fulfill({ json: { user: null } }))
  await page.route('**/api/auth/providers', route => route.fulfill({ json: { google: false, github: false, dev: false } }))
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { daily: { time: [] } } }))
  await page.goto('/')
  await page.locator('.lazy-card', { hasText: '岁月里程' }).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: '管理重要日子与日程', exact: true }).click()

  const modal = page.getByRole('dialog', { name: '岁月里程 · 重要日子与日程' })
  const form = modal.locator('.accordion-panel')
  const calendar = form.getByRole('radiogroup', { name: '历法' })
  for (const isLunar of [false, true]) {
    await modal.getByRole('button', { name: '添加日程、生日或纪念日', exact: true }).click()
    await expect(calendar.getByRole('radio', { name: '公历', exact: true })).toBeChecked()
    await expect(form.getByRole('checkbox')).toHaveCount(0)
    await form.getByRole('button', { name: '💖 纪念日', exact: true }).click()
    await expect(calendar).toBeVisible()
    await form.getByRole('button', { name: '📅 日程计划', exact: true }).click()
    await expect(calendar).toHaveCount(0)
    await form.getByRole('button', { name: '🎂 生日', exact: true }).click()

    const solar = calendar.getByRole('radio', { name: '公历', exact: true })
    await solar.focus()
    await page.keyboard.press('ArrowRight')
    await expect(calendar.getByRole('radio', { name: '农历', exact: true })).toBeChecked()
    await page.keyboard.press('ArrowLeft')
    await expect(solar).toBeChecked()
    await calendar.getByText(isLunar ? '农历' : '公历', { exact: true }).click()
    const title = `新增${isLunar ? '农历' : '公历'}测试生日`
    await form.getByPlaceholder('寿星姓名/事件 (如: 妈妈生日)', { exact: true }).fill(title)
    await form.getByPlaceholder('日期 MM-DD 或 YYYY-MM-DD', { exact: true }).fill('1990-08-20')
    expect(await form.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    await form.getByRole('button', { name: '确认添加', exact: true }).click()
    await expect(form).toHaveCount(0)
    const saved = await page.evaluate(title => JSON.parse(localStorage.getItem('daygarden_guest_preferences_v1')).customEvents.find(event => event.title === title), title)
    expect(saved).toMatchObject({ title, date: '1990-08-20', type: 'birthday', isLunar })

    await modal.locator('.group', { hasText: title }).getByRole('button', { name: '编辑', exact: true }).click()
    const editor = modal.locator('.edit-card-panel')
    await expect(editor.getByRole('radio', { name: isLunar ? '农历' : '公历', exact: true })).toBeChecked()
    await editor.getByRole('button', { name: '取消', exact: true }).click()
    await expect(editor).toHaveCount(0)
  }
})
