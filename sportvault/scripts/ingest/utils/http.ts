export async function fetchWithDelay(
  url: string,
  headers: Record<string, string> = {},
  delayMs = 0,
  retries = 5,
): Promise<unknown> {
  if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs))
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers })
    if (res.status === 429) {
      const wait = Math.min(2000 * 2 ** attempt, 30000)
      console.log(`  429 rate-limit, retrying in ${wait}ms...`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`)
    return res.json()
  }
  throw new Error(`HTTP 429 after ${retries} retries: ${url}`)
}
