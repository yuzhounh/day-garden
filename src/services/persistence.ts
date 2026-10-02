import { reactive } from 'vue'

export const storageState = reactive({ error: '' })
const failedKeys = new Set<string>()

export function saveLocal(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    failedKeys.delete(key)
    if (!failedKeys.size) storageState.error = ''
    return true
  } catch {
    failedKeys.add(key)
    storageState.error = '本机保存失败：浏览器存储不可用或空间不足。请先导出重要内容，并检查浏览器设置。'
    return false
  }
}
