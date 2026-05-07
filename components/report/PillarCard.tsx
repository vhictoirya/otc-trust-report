"use client"

import { cn } from "@/lib/utils"
import type { PillarScore } from "@/lib/types"
import { CheckCircle, AlertTriangle, XCircle, Info } from "lucide-react"

interface Props {
  title: string
  pillar: PillarScore
  icon: React.ReactNode
}

const impactIcon = {
  positive: <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />,
  neutral: <Info className="w-3.5 h-3.5 text-gray-500 shrink-0" />,
  negative: <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />,
}

export function PillarCard({ title, pillar, icon }: Props) {
  const pct = Math.round((pillar.score / pillar.maxScore) * 100)
  const barColor =
    pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500"

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400">{icon}</span>
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <span className="text-sm font-bold text-white tabular-nums">
          {pct}/100
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/5 rounded-full mb-3 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Signals */}
      <div className="space-y-1.5">
        {pillar.signals.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            {impactIcon[s.impact]}
            <span className="text-xs text-gray-500 flex-1">{s.label}</span>
            <span className="text-xs text-gray-300 font-medium">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
