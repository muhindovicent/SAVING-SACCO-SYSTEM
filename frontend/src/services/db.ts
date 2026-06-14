import { DB_PREFIX } from '@/lib/constants'

const DB = {
  get<T = any>(key: string): T | null {
    try {
      const raw = localStorage.getItem(DB_PREFIX + key)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  set(key: string, value: any): void {
    localStorage.setItem(DB_PREFIX + key, JSON.stringify(value))
  },
  remove(key: string): void {
    localStorage.removeItem(DB_PREFIX + key)
  },
  push<T>(key: string, item: T): void {
    const arr = DB.get<T[]>(key) || []
    arr.push(item)
    DB.set(key, arr)
  },
}

export default DB
