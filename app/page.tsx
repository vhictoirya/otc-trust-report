"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Shield, Zap, Globe, Activity } from "lucide-react"
import { resolveENS } from "@/lib/ens"

export default function HomePage() {
  const router = useRouter()
  const [wallet, setWallet] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    let trimmed = wallet.trim()
    if (!trimmed) return

    // Resolve ENS names before validating/navigating
    if (trimmed.toLowerCase().endsWith(".eth")) {
      setLoading(true)
      setError("")
      const resolved = await resolveENS(trimmed)
      setLoading(false)
      if (!resolved) {
        setError(`Could not resolve "${trimmed}" — check the ENS name and try again`)
        return
      }
      trimmed = resolved
    }

    const isEvm = trimmed.startsWith("0x") && trimmed.length === 42
    const isSolana = trimmed.length >= 32 && trimmed.length <= 44 && !trimmed.startsWith("0x")

    if (!isEvm && !isSolana) {
      setError("Enter a valid EVM (0x...) or Solana address, or an ENS name (e.g. vitalik.eth)")
      return
    }
    setError("")
    router.push(`/report/${trimmed}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute inset-0 bg-radial-gradient from-indigo-950/30 via-transparent to-transparent" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm mb-6">
            <Shield className="w-3.5 h-3.5" />
            Powered by GoldRush API
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            OTC Trust Report
          </h1>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Instant counterparty intelligence from full on-chain history.
            Know who you&apos;re trading with before the deal closes.
          </p>
          <p className="text-gray-600 text-xs mt-2">Supports EVM wallets (full scoring) and Solana wallets</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="EVM address, Solana address, or ENS name..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-36 py-5 text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/7 transition-all text-sm"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              {loading ? "Resolving…" : "Analyze"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2 ml-1">{error}</p>}
        </form>

        {/* Example addresses */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          <span className="text-gray-600 text-xs mt-1">Try:</span>
          {[
            { label: "vitalik.eth", addr: "vitalik.eth" },
            { label: "0x Whale", addr: "0x47ac0fb4f2d84898e4d9e7b4dab3c24507a6d503" },
            { label: "SOL Whale", addr: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" },
          ].map(({ label, addr }) => (
            <button
              key={addr}
              onClick={() => setWallet(addr)}
              className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              {label}
            </button>
          ))}
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              icon: Globe,
              title: "100+ Chains",
              desc: "Cross-chain activity via GoldRush",
            },
            {
              icon: Shield,
              title: "Security Scan",
              desc: "Approval exposure & risk flags",
            },
            {
              icon: Activity,
              title: "Behavioral Signals",
              desc: "Velocity spikes, dormancy & mixer detection",
            },
            {
              icon: Zap,
              title: "Instant Report",
              desc: "Score in under 30 seconds",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-xl p-4">
              <Icon className="w-5 h-5 text-indigo-400 mb-2" />
              <div className="text-white text-sm font-semibold mb-0.5">{title}</div>
              <div className="text-gray-500 text-xs">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
