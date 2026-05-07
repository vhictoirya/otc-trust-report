"use client"

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import type { TrustReport } from "@/lib/types"

interface Props {
  pillars: TrustReport["pillars"]
}

export function PillarRadar({ pillars }: Props) {
  const data = [
    {
      axis: "Identity",
      score: Math.round((pillars.identity.score / pillars.identity.maxScore) * 100),
    },
    {
      axis: "Financial",
      score: Math.round((pillars.financial.score / pillars.financial.maxScore) * 100),
    },
    {
      axis: "Track Record",
      score: Math.round((pillars.trackRecord.score / pillars.trackRecord.maxScore) * 100),
    },
    {
      axis: "Security",
      score: Math.round((pillars.security.score / pillars.security.maxScore) * 100),
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#ffffff10" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
        />
        <Radar
          name="Trust Score"
          dataKey="score"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "8px",
            color: "#e2e8f0",
            fontSize: "12px",
          }}
          formatter={(v) => [`${v}/100`, "Score"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
