"use client"

import { useMemo } from "react"
import { format, parseISO, eachDayOfInterval, subDays } from "date-fns"

interface Props {
  data: { date: string; count: number }[]
}

export function ActivityHeatmap({ data }: Props) {
  const { weeks, maxCount } = useMemo(() => {
    const countMap: Record<string, number> = {}
    for (const d of data) countMap[d.date] = d.count

    const end = new Date()
    const start = subDays(end, 364)
    const days = eachDayOfInterval({ start, end })
    const max = Math.max(...Object.values(countMap), 1)

    const grouped: Date[][] = []
    let week: Date[] = []
    for (const day of days) {
      week.push(day)
      if (week.length === 7) {
        grouped.push(week)
        week = []
      }
    }
    if (week.length > 0) grouped.push(week)

    return { weeks: grouped, maxCount: max, countMap }
  }, [data])

  const countMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const d of data) m[d.date] = d.count
    return m
  }, [data])

  function getColor(count: number): string {
    if (count === 0) return "#1e293b"
    const intensity = count / maxCount
    if (intensity >= 0.75) return "#6366f1"
    if (intensity >= 0.5) return "#818cf8"
    if (intensity >= 0.25) return "#a5b4fc"
    return "#c7d2fe"
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd")
              const count = countMap[dateStr] ?? 0
              return (
                <div
                  key={dateStr}
                  title={`${dateStr}: ${count} tx`}
                  className="w-3 h-3 rounded-sm cursor-default"
                  style={{ background: getColor(count) }}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-gray-600 text-xs">Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ background: getColor(Math.round(i * maxCount)) }}
          />
        ))}
        <span className="text-gray-600 text-xs">More</span>
      </div>
    </div>
  )
}
