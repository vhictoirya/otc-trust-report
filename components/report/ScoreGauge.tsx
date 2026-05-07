"use client"

import { getScoreColor, getRiskColor, getRiskBg } from "@/lib/utils"
import type { TrustReport } from "@/lib/types"

interface Props {
  score: number
  riskLevel: TrustReport["riskLevel"]
}

export function ScoreGauge({ score, riskLevel }: Props) {
  const color = getScoreColor(score)
  const radius = 80
  const strokeWidth = 10
  const circumference = 2 * Math.PI * radius
  const dash = (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={200} height={200} className="score-ring" style={{ color }}>
          {/* Background ring */}
          <circle
            cx={100}
            cy={100}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />
          {/* Score arc */}
          <circle
            cx={100}
            cy={100}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={circumference / 4}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-white tabular-nums">{score}</span>
          <span className="text-gray-500 text-sm">/ 100</span>
        </div>
      </div>
      <div className={`mt-3 px-4 py-1.5 rounded-full border text-sm font-semibold ${getRiskBg(riskLevel)} ${getRiskColor(riskLevel)}`}>
        {riskLevel} RISK
      </div>
    </div>
  )
}
