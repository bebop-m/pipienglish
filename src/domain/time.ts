// 本地日键:所有"某一天"的判定统一走这里

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dayKeyOf(ms: number): string {
  return dayKey(new Date(ms))
}

/** 两个本地日键相差的天数(b − a);按 UTC 日历计算,不受夏令时影响 */
export function daysBetween(a: string, b: string): number {
  const toUtc = (key: string) => {
    const [y, m, d] = key.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000)
}

export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00`)
  d.setDate(d.getDate() + days)
  return dayKey(d)
}
