const numberFormatter = new Intl.NumberFormat("fa-IR")

export const fa = (value: number): string => numberFormatter.format(value)

const relativeFormatter = new Intl.RelativeTimeFormat("fa", { numeric: "auto" })

const dayFormatter = new Intl.DateTimeFormat("fa-IR", {
  day: "numeric",
  month: "long",
})

const shortDateFormatter = new Intl.DateTimeFormat("fa-IR", {
  day: "numeric",
  month: "numeric",
  year: "numeric",
})

const units: { limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] =
  [
    { limit: 60_000, divisor: 1_000, unit: "second" },
    { limit: 3_600_000, divisor: 60_000, unit: "minute" },
    { limit: 86_400_000, divisor: 3_600_000, unit: "hour" },
    { limit: 2_592_000_000, divisor: 86_400_000, unit: "day" },
  ]

/** "۳ دقیقه پیش" / "۲ ساعت دیگر" */
export const relativeTime = (date: Date, now = new Date()): string => {
  const diff = date.getTime() - now.getTime()
  const magnitude = Math.abs(diff)

  for (const { limit, divisor, unit } of units) {
    if (magnitude < limit) {
      return relativeFormatter.format(Math.round(diff / divisor), unit)
    }
  }
  return shortDateFormatter.format(date)
}

/** Parses a `YYYY-MM-DD` day as local midnight, avoiding UTC shift. */
export const parseDay = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

export const today = (now = new Date()): string => {
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const day = `${now.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

export type DueStatus = "overdue" | "today" | "upcoming" | "none"

/** Compares calendar days rather than timestamps, so "today" is not off by timezone. */
export const dueStatus = (value: string | null, now = new Date()): DueStatus => {
  if (value === null) return "none"
  if (value < today(now)) return "overdue"
  if (value === today(now)) return "today"
  return "upcoming"
}

export const formatDay = (value: string): string => dayFormatter.format(parseDay(value))

export const shortDate = (value: string): string =>
  shortDateFormatter.format(parseDay(value))