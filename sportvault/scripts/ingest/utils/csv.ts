import fs from 'fs'
import { parse } from 'csv-parse'

export function validateCsv(path: string, requiredCols: string[]): void {
  if (!fs.existsSync(path)) throw new Error(`CSV missing: ${path}`)
  const stat = fs.statSync(path)
  if (stat.size === 0) throw new Error(`CSV empty: ${path}`)
  const fd = fs.openSync(path, 'r')
  const buf = Buffer.alloc(4096)
  fs.readSync(fd, buf, 0, 4096, 0)
  fs.closeSync(fd)
  const headerLine = buf.toString('utf-8').split('\n')[0].split(',').map(s => s.trim())
  for (const col of requiredCols) {
    if (!headerLine.includes(col)) throw new Error(`CSV ${path} missing column: ${col}`)
  }
}

export async function streamCsvToArray(path: string): Promise<Record<string, string>[]> {
  const rows: Record<string, string>[] = []
  const parser = fs.createReadStream(path).pipe(parse({ columns: true, skip_empty_lines: true }))
  for await (const row of parser as AsyncIterable<Record<string, string>>) rows.push(row)
  return rows
}

export function numberOrZero(value: string | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}
