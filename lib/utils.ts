import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export function formatAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function getRiskColor(level: string): string {
  switch (level) {
    case "TRUSTED": return "text-emerald-400"
    case "LOW": return "text-green-400"
    case "MEDIUM": return "text-yellow-400"
    case "HIGH": return "text-orange-400"
    case "CRITICAL": return "text-red-500"
    default: return "text-gray-400"
  }
}

export function getRiskBg(level: string): string {
  switch (level) {
    case "TRUSTED": return "bg-emerald-500/10 border-emerald-500/30"
    case "LOW": return "bg-green-500/10 border-green-500/30"
    case "MEDIUM": return "bg-yellow-500/10 border-yellow-500/30"
    case "HIGH": return "bg-orange-500/10 border-orange-500/30"
    case "CRITICAL": return "bg-red-500/10 border-red-500/30"
    default: return "bg-gray-500/10 border-gray-500/30"
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981"
  if (score >= 65) return "#22c55e"
  if (score >= 45) return "#f59e0b"
  if (score >= 25) return "#f97316"
  return "#ef4444"
}
