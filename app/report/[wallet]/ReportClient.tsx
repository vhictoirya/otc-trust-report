"use client"

import { useState } from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"
import {
  ArrowLeft,
  Copy,
  Check,
  Shield,
  User,
  DollarSign,
  Activity,
  Lock,
  FileDown,
} from "lucide-react"
import type { TrustReport } from "@/lib/types"
import { formatAddress } from "@/lib/utils"
import { ScoreGauge } from "@/components/report/ScoreGauge"
import { PillarRadar } from "@/components/report/PillarRadar"
import { PillarCard } from "@/components/report/PillarCard"
import { PortfolioDonut } from "@/components/report/PortfolioDonut"
import { ActivityHeatmap } from "@/components/report/ActivityHeatmap"
import { PnLCurve } from "@/components/report/PnLCurve"
import { ValueAtRiskBar } from "@/components/report/ValueAtRiskBar"
import { HyperliquidChart } from "@/components/report/HyperliquidChart"
import { ChainTimeline } from "@/components/report/ChainTimeline"
import { FlagsList } from "@/components/report/FlagsList"
import { SummaryStats } from "@/components/report/SummaryStats"
import { SolanaBreakdown } from "@/components/report/SolanaBreakdown"

interface Props {
  report: TrustReport
}

export function ReportClient({ report }: Props) {
  const [copied, setCopied] = useState(false)

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadPdf() {
    const prev = document.title
    document.title = `OTC-Trust-Report-${report.wallet.slice(0, 8)}`
    window.print()
    document.title = prev
  }

  const pillarIcons = {
    identity: <User className="w-4 h-4" />,
    financial: <DollarSign className="w-4 h-4" />,
    trackRecord: <Activity className="w-4 h-4" />,
    security: <Lock className="w-4 h-4" />,
  }

  const pillarTitles = {
    identity: "Identity & Age",
    financial: "Financial Health",
    trackRecord: "Track Record",
    security: "Security Posture",
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Top bar */}
      <div className="no-print border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            New Report
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Shield className="w-3.5 h-3.5" />
            Generated {format(parseISO(report.generatedAt), "dd MMM yyyy HH:mm")} UTC
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadPdf}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied!" : "Share"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Print-only header */}
        <div className="hidden print:block mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-mono">OTC Trust Report</p>
              <p className="text-sm font-mono mt-1 text-gray-800">{report.wallet}</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Generated {format(parseISO(report.generatedAt), "dd MMM yyyy HH:mm")} UTC</p>
              <p className="mt-0.5">Powered by GoldRush API</p>
            </div>
          </div>
        </div>

        {/* Hero: Score + Radar + Flags */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score gauge */}
          <div className="glass rounded-2xl p-6 flex flex-col items-center justify-center">
            <div className="text-gray-500 text-xs font-mono mb-4 text-center">
              {formatAddress(report.wallet)}
            </div>
            <ScoreGauge score={report.overallScore} riskLevel={report.riskLevel} />
            <div className="mt-4 text-center">
              <div className="text-gray-600 text-xs">OTC Trust Score</div>
            </div>
          </div>

          {/* Radar */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">Pillar Breakdown</h3>
            <PillarRadar pillars={report.pillars} />
          </div>

          {/* Flags */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Key Signals</h3>
            <FlagsList flags={report.flags} />
          </div>
        </div>

        {/* Summary stats */}
        <SummaryStats summary={report.summary} isSolana={!report.wallet.startsWith("0x")} />

        {/* Pillar detail cards */}
        <div>
          <h2 className="text-white font-semibold mb-4">Scoring Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(report.pillars) as Array<keyof typeof report.pillars>).map((key) => (
              <PillarCard
                key={key}
                title={pillarTitles[key]}
                pillar={report.pillars[key]}
                icon={pillarIcons[key]}
              />
            ))}
          </div>
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">Portfolio Composition</h3>
            <PortfolioDonut data={report.chartData.portfolioComposition} />
          </div>
          {report.chartData.solanaBreakdown ? (
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-semibold text-gray-400">Solana On-Chain Activity</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">Solana</span>
              </div>
              <SolanaBreakdown data={report.chartData.solanaBreakdown} />
            </div>
          ) : (
            <div className="glass rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Approval Exposure</h3>
              <ValueAtRiskBar
                data={report.chartData.valueAtRisk}
                totalPortfolio={report.summary.totalPortfolioUsd}
              />
            </div>
          )}
        </div>


        {/* Activity heatmap */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Transaction Activity (12 months)</h3>
          <ActivityHeatmap data={report.chartData.activityHeatmap} />
        </div>

        {/* Charts row 2 */}
        <div className={`grid grid-cols-1 gap-6 ${report.summary.hyperliquidVolume > 0 ? "lg:grid-cols-2" : ""}`}>
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">Cumulative Transaction Activity</h3>
            <PnLCurve data={report.chartData.pnlCurve} />
          </div>
          {report.summary.hyperliquidVolume > 0 && (
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-semibold text-gray-400">Hyperliquid Perp Activity (90d)</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-600">supplementary</span>
              </div>
              <HyperliquidChart data={report.chartData.hyperliquidVolume} />
            </div>
          )}
        </div>

        {/* Chain timeline */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">Multi-Chain Footprint</h3>
          <ChainTimeline chains={report.chartData.chainActivity} />
        </div>

        {/* Footer */}
        <div className="text-center text-gray-700 text-xs pb-8">
          Powered by GoldRush API · Supplementary data via Hyperliquid Info API · Data valid for 10 minutes
        </div>
      </div>
    </div>
  )
}
