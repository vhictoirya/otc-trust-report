"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { SolanaBreakdown } from "@/lib/types"

interface Props {
  data: SolanaBreakdown
}

const TYPE_COLORS: Record<string, string> = {
  Swaps:      "#6366f1",
  Transfers:  "#22c55e",
  Staking:    "#f59e0b",
  NFT:        "#ec4899",
  Other:      "#64748b",
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

export function SolanaBreakdown({ data }: Props) {
  const pieData = [
    { name: "Swaps",     value: data.swaps },
    { name: "Transfers", value: data.p2pTransfers },
    { name: "Staking",   value: data.staking },
    { name: "NFT",       value: data.nft },
    { name: "Other",     value: data.other },
  ].filter((d) => d.value > 0)

  const total = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="space-y-6">
      {/* Tx type pie + stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie chart */}
        <div>
          <p className="text-xs text-gray-500 mb-3">Transaction type distribution ({total} classified)</p>
          {total > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={TYPE_COLORS[entry.name] ?? "#64748b"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", fontSize: "12px", color: "#e2e8f0" }}
                  formatter={(v, name) => [`${Number(v)} txs (${total > 0 ? ((Number(v) / total) * 100).toFixed(0) : 0}%)`, String(name)]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ color: "#94a3b8", fontSize: "11px" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-600 text-sm">No classified transactions</div>
          )}
        </div>

        {/* Volume + fees stats */}
        <div className="space-y-3">
          {[
            { label: "Native SOL Volume", value: fmt(data.nativeSolVolumeUsd), note: "direct SOL transfers" },
            { label: "Large SOL Transfers ($10k+)", value: `${data.largeSolTxCount}`, note: "verified large moves" },
            { label: "Total Fees Paid", value: fmt(data.totalFeesUsd), note: "proxy for activity depth" },
            { label: "Liquid Staking Held", value: data.liquidStakingUsd > 0 ? fmt(data.liquidStakingUsd) : "None", note: data.liquidStakingSymbols.join(", ") || "mSOL / JitoSOL / bSOL" },
          ].map((s) => (
            <div key={s.label} className="flex justify-between items-start py-2 border-b border-white/5">
              <div>
                <div className="text-xs text-gray-400">{s.label}</div>
                <div className="text-xs text-gray-600 mt-0.5">{s.note}</div>
              </div>
              <div className="text-sm font-semibold text-white">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Protocol list */}
      {data.topProtocols.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Detected Solana protocols</p>
          <div className="flex flex-wrap gap-2">
            {data.topProtocols.map((name) => (
              <span
                key={name}
                className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 capitalize"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
