import { test, expect } from '@playwright/test'

test.use({ launchOptions: { args: ['--enable-unsafe-swiftshader'] } })

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: test.info().project.name === 'mobile' ? 390 : 1440, height: 600 })
  await page.route('https://api.open-meteo.com/**', route => route.abort())
})

test('Offscreen garden waits beyond the old idle timeout, then loads once near the viewport', async ({ page }) => {
  const downloads = []
  page.on('request', request => { if (/\/assets\/garden-[^/]+\.js/.test(request.url())) downloads.push(request.url()) })
  await page.goto('/')
  const canvas = page.locator('.garden-canvas')
  await expect(canvas).toHaveCount(1)
  await expect.poll(() => canvas.evaluate(node => node.getBoundingClientRect().top - innerHeight)).toBeGreaterThan(240)
  await page.waitForTimeout(5500)
  expect(downloads).toEqual([])
  await expect(canvas).not.toHaveClass(/ready/)
  await canvas.scrollIntoViewIfNeeded()
  await expect(canvas).toHaveClass(/ready/, { timeout: 15000 })
  expect(downloads).toHaveLength(1)
  await page.evaluate(() => scrollTo(0, 0))
  await canvas.scrollIntoViewIfNeeded()
  await expect(canvas).toHaveClass(/ready/)
  expect(downloads).toHaveLength(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('A failed near-viewport garden download keeps the existing 2D fallback', async ({ page }) => {
  await page.route('**/assets/garden-*.js', route => route.abort())
  await page.goto('/')
  const canvas = page.locator('.garden-canvas')
  await expect(canvas).toHaveCount(1)
  await canvas.scrollIntoViewIfNeeded()
  await expect(page.locator('.scene-garden')).toHaveCount(1)
  await expect(canvas).toHaveCount(0)
})
