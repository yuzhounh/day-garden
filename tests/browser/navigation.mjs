import { expect } from '@playwright/test'

async function usesDrawer(page) {
  await expect(page.locator('.topbar')).toBeVisible()
  return page.getByRole('button', { name: '展开导航菜单', exact: true }).isVisible()
}

async function openDrawer(page) {
  const drawer = page.getByRole('dialog', { name: '导航与功能菜单', exact: true })
  if (!await drawer.isVisible()) {
    await page.getByRole('button', { name: '展开导航菜单', exact: true }).click()
  }
  await expect(drawer).toBeVisible()
  return drawer
}

async function openHeaderAction(page, action) {
  if (await usesDrawer(page)) {
    const drawer = await openDrawer(page)
    const names = { account: /^账户与同步/, settings: /^布置我的花园/, sort: /^卡片排序模式/, city: /^城市定位/ }
    await drawer.getByRole('button', { name: names[action] }).click()
    await expect(drawer).not.toBeVisible()
    return true
  }
  const names = {
    account: /^(我的花园 · 账户与云端同步|云端已同步|同步中|本机已保存)$/,
    settings: '布置我的花园 · 设置与个性化',
    sort: /^(开启排序模式|退出排序模式)$/,
    city: '选择或搜索城市',
  }
  await page.getByRole('button', { name: names[action], exact: true }).click()
  return false
}

export async function openAccount(page, { synced = false } = {}) {
  await openHeaderAction(page, 'account')
  const account = page.locator('.account-modal')
  await expect(account).toBeVisible()
  if (synced) await expect(account.locator('.account-tag-row .pill.sage')).toHaveText('已同步')
}

export async function openSettings(page) {
  await openHeaderAction(page, 'settings')
  await expect(page.locator('.settings-content')).toBeVisible()
}

export async function enableSorting(page) {
  await openHeaderAction(page, 'sort')
  await expect(page.getByRole('button', { name: '完成排序', exact: true })).toBeVisible()
}

export async function openCityPicker(page) {
  const mobile = await openHeaderAction(page, 'city')
  const picker = mobile
    ? page.getByRole('dialog', { name: '选择城市定位', exact: true })
    : page.locator('#city-options')
  await expect(picker).toBeVisible()
  return picker
}

export async function selectCity(page, name) {
  const picker = await openCityPicker(page)
  await picker.getByRole('button', { name, exact: true }).first().click()
  await expect(picker).not.toBeVisible()
}

export async function expectSelectedCity(page, name) {
  if (await usesDrawer(page)) {
    const drawer = await openDrawer(page)
    await expect(drawer.getByRole('button', { name: /^城市定位/ }).locator('.drawer-nav-badge')).toHaveText(name)
    await drawer.getByRole('button', { name: '关闭菜单', exact: true }).click()
    await expect(drawer).not.toBeVisible()
  } else {
    await expect(page.getByRole('button', { name: '选择或搜索城市', exact: true })).toContainText(name)
  }
}
