import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "OTC Trust Report — On-Chain Counterparty Intelligence",
  description: "Generate instant trust scores for OTC counterparties from full on-chain history",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
