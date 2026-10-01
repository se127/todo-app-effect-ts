import { useState } from "react"
import { toGregorian, toJalaali, jalaaliMonthLength } from "jalaali-js"
import { ChevronRightIcon, ChevronLeftIcon } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { parseDay, today as todayKey } from "@/utils/format"

/** Persian months, indexed 1-12 (فروردین … اسفند). */
const MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
]

/** Saturday-first, matching the Iranian week. */
const WEEKDAYS = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
]

const digitMap = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]

export const toPersianDigits = (value: number | string): string =>
  String(value).replace(/\d/g, (d) => digitMap[Number(d)])

interface JalaliCalendarProps {
  /** Selected day as a Gregorian `YYYY-MM-DD` key, or null. */
  value: string | null
  onChange: (value: string | null) => void
  /** Days before this are not selectable. */
  minDate?: string
}

/**
 * A Jalali (Solar Hijri) month grid. react-day-picker localises month *names*
 * into Persian but keeps the Gregorian calendar underneath, so its grid showed
 * Gregorian months and years next to Persian labels elsewhere — this renders
 * the actual Persian calendar instead.
 */
export function JalaliCalendar({
  value,
  onChange,
  minDate = todayKey(),
}: JalaliCalendarProps) {
  const anchor = value ? parseDay(value) : new Date()
  const initial = toJalaali(anchor)

  const [cursor, setCursor] = useState({ jy: initial.jy, jm: initial.jm })
  const [today, setToday] = useState(() => todayKey())

  /* Years offered in the picker, centred on the current Jalali year. */
  const thisYear = toJalaali(new Date()).jy
  const minYear = thisYear - 12
  const maxYear = thisYear + 12

  const shift = (delta: number) => {
    setCursor((current) => {
      let jm = current.jm + delta
      let jy = current.jy
      if (jm < 1) {
        jm = 12
        jy -= 1
      } else if (jm > 12) {
        jm = 1
        jy += 1
      }
      return { jy: Math.min(maxYear, Math.max(minYear, jy)), jm }
    })
  }

  const daysInMonth = jalaaliMonthLength(cursor.jy, cursor.jm)
  const first = toGregorian(cursor.jy, cursor.jm, 1)
  // JS weeks start on Sunday; shift so Saturday lands in column 0.
  const leading = (new Date(first.gy, first.gm - 1, first.gd).getDay() + 1) % 7

  const cells: Array<{ key: string; day: number } | null> = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const { gy, gm, gd } = toGregorian(cursor.jy, cursor.jm, index + 1)
      const month = `${gm}`.padStart(2, "0")
      const day = `${gd}`.padStart(2, "0")
      return { key: `${gy}-${month}-${day}`, day: index + 1 }
    }),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div dir="rtl" className="bg-popover p-2 text-popover-foreground">
      <div className="mb-1 flex items-center justify-between gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => shift(-1)}
          aria-label="ماه قبل"
        >
          <ChevronRightIcon />
        </Button>

        <div className="flex items-center gap-1">
          <Select
            value={String(cursor.jm)}
            onValueChange={(next) =>
              setCursor((current) => ({ ...current, jm: Number(next) }))
            }
          >
            <SelectTrigger
              size="sm"
              aria-label="انتخاب ماه"
              className="h-7 w-auto gap-1 border-none bg-transparent px-1.5 shadow-none hover:bg-accent"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((name, index) => (
                <SelectItem key={name} value={String(index + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(cursor.jy)}
            onValueChange={(next) =>
              setCursor((current) => ({ ...current, jy: Number(next) }))
            }
          >
            <SelectTrigger
              size="sm"
              aria-label="انتخاب سال"
              className="h-7 w-auto gap-1 border-none bg-transparent px-1.5 shadow-none hover:bg-accent"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {Array.from(
                { length: maxYear - minYear + 1 },
                (_, index) => minYear + index,
              )
                .reverse()
                .map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {toPersianDigits(year)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => shift(1)}
          aria-label="ماه بعد"
        >
          <ChevronLeftIcon />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 pb-1">
        {WEEKDAYS.map((label) => (
          <span
            key={label}
            className="px-0.5 py-1 text-center text-[0.625rem] font-normal text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, index) => {
          if (cell === null) return <span key={`pad-${index}`} />

          const isSelected = cell.key === value
          const isToday = cell.key === today
          const disabled = cell.key < minDate

          return (
            <button
              key={cell.key}
              type="button"
              disabled={disabled}
              onClick={() => onChange(isSelected ? null : cell.key)}
              aria-label={`${MONTHS[cursor.jm - 1]} ${cell.day}`}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex size-9 items-center justify-center rounded-md text-xs transition-colors",
                "focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none",
                disabled && "text-muted-foreground/40",
                !disabled && !isSelected && "hover:bg-accent hover:text-accent-foreground",
                isSelected && "bg-primary text-primary-foreground",
                !isSelected && isToday && "bg-accent font-medium text-accent-foreground",
              )}
            >
              {toPersianDigits(cell.day)}
            </button>
          )
        })}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setToday(todayKey())
          const current = toJalaali(new Date())
          setCursor({ jy: current.jy, jm: current.jm })
          onChange(todayKey())
        }}
        className="mt-1 w-full text-xs text-muted-foreground"
      >
        امروز
      </Button>
    </div>
  )
}