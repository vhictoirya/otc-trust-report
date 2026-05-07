"use client"

import type { Flag } from "@/lib/types"
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  flags: Flag[]
}

const flagConfig = {
  critical: {
    icon: XCircle,
    class: "bg-red-500/10 border-red-500/30 text-red-400",
    iconClass: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    class: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
    iconClass: "text-yellow-400",
  },
  info: {
    icon: Info,
    class: "bg-blue-500/10 border-blue-500/30 text-blue-300",
    iconClass: "text-blue-400",
  },
  positive: {
    icon: CheckCircle,
    class: "bg-green-500/10 border-green-500/30 text-green-300",
    iconClass: "text-green-400",
  },
}

export function FlagsList({ flags }: Props) {
  if (flags.length === 0) return null

  // Sort: critical first, then warnings, info, positives
  const order: Flag["type"][] = ["critical", "warning", "info", "positive"]
  const sorted = [...flags].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))

  return (
    <div className="space-y-2">
      {sorted.map((flag, i) => {
        const cfg = flagConfig[flag.type]
        const Icon = cfg.icon
        return (
          <div key={i} className={cn("flex items-start gap-3 px-4 py-3 rounded-xl border", cfg.class)}>
            <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", cfg.iconClass)} />
            <span className="text-sm">{flag.message}</span>
          </div>
        )
      })}
    </div>
  )
}
