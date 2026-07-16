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

export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00`)
  d.setDate(d.getDate() + days)
  return dayKey(d)
}
