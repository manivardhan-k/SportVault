import fs from 'node:fs'
import path from 'node:path'

if (process.env.VERCEL !== '1') {
  process.exit(0)
}

const appRoot = process.cwd()
const nextDir = path.join(appRoot, '.next')
const routesManifest = path.join(nextDir, 'routes-manifest.json')
const deterministicManifest = path.join(nextDir, 'routes-manifest-deterministic.json')

if (!fs.existsSync(nextDir)) {
  console.warn('[vercel-postbuild] .next not found; skipping Vercel manifest guard')
  process.exit(0)
}

if (fs.existsSync(routesManifest) && !fs.existsSync(deterministicManifest)) {
  fs.copyFileSync(routesManifest, deterministicManifest)
}

const targetRoots = new Set()
const traceRoot = process.env.NEXT_PRIVATE_OUTPUT_TRACE_ROOT

if (traceRoot) {
  targetRoots.add(path.resolve(traceRoot))
} else if (path.basename(appRoot) === 'sportvault') {
  targetRoots.add(path.dirname(appRoot))
}

for (const targetRoot of targetRoots) {
  if (targetRoot === appRoot || !fs.existsSync(targetRoot)) continue

  const targetNextDir = path.join(targetRoot, '.next')
  fs.rmSync(targetNextDir, { recursive: true, force: true })
  fs.cpSync(nextDir, targetNextDir, { recursive: true })
  console.log(`[vercel-postbuild] Copied .next to ${targetNextDir}`)
}
