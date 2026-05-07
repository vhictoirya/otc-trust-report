export async function resolveENS(name: string): Promise<string | null> {
  if (!name.toLowerCase().endsWith(".eth")) return null
  try {
    const res = await fetch(
      `https://api.ensideas.com/ens/resolve/${encodeURIComponent(name)}`
    )
    if (!res.ok) return null
    const data = (await res.json()) as { address?: string }
    return data.address ?? null
  } catch {
    return null
  }
}
