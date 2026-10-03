import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  outputDir: './tmp/playwright',
  workers: 1,
  retries: 0,
  timeout: 30000,
  reporter: 'list',
  use: { baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:8787', headless: true, timezoneId: 'Asia/Shanghai', trace: 'retain-on-failure', screenshot: 'only-on-failure', ...(process.platform === 'win32' ? { channel: 'chrome' } : {}) },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 }, extraHTTPHeaders: { 'CF-Connecting-IP': '127.0.0.1' } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, extraHTTPHeaders: { 'CF-Connecting-IP': '127.0.0.2' } } },
  ],
})
