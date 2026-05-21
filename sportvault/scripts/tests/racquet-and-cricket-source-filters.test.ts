import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parse } from 'csv-parse/sync'
import { findPython } from '../ingest/utils/python'

const root = process.cwd()
const python = findPython()
const tempDir = mkdtempSync(path.join(os.tmpdir(), 'sv-source-filter-'))

function runScript(scriptName: string, args: string[]) {
  execFileSync(
    python,
    [path.join(root, 'scripts', 'ingest', scriptName), ...args],
    { cwd: root, stdio: 'pipe' }
  )
}

function readCsvRows(filePath: string) {
  return parse(readFileSync(filePath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
  }) as Array<Record<string, string>>
}

{
  const output = path.join(tempDir, 'tennis_atp.csv')
  runScript('fetch_tennis.py', [
    '--year', '2024',
    '--tour', 'atp',
    '--input-csv', path.join(root, 'scripts', 'tests', 'fixtures', 'tennis_atp_filter_fixture.csv'),
    '--output', output,
  ])
  const rows = readCsvRows(output)
  const sinner = rows.find(row => row.player_name === 'Jannik Sinner' && row.surface === 'ALL')
  assert.ok(sinner, 'expected Jannik Sinner ALL row')
  assert.equal(sinner!.wins, '2')
  assert.equal(sinner!.matches, '2')
  assert.equal(sinner!.return_won_pct, '26.67')
}

{
  const output = path.join(tempDir, 'tennis_wta.csv')
  runScript('fetch_tennis.py', [
    '--year', '2024',
    '--tour', 'wta',
    '--input-csv', path.join(root, 'scripts', 'tests', 'fixtures', 'tennis_wta_filter_fixture.csv'),
    '--output', output,
  ])
  const rows = readCsvRows(output)
  const iga = rows.find(row => row.player_name === 'Iga Swiatek' && row.surface === 'ALL')
  assert.ok(iga, 'expected Iga Swiatek ALL row')
  assert.equal(iga!.wins, '5')
  assert.equal(iga!.matches, '5')
}

{
  const output = path.join(tempDir, 'cricket_t20i.csv')
  runScript('fetch_cricket.py', [
    '--year', '2024',
    '--type', 't20i',
    '--input-dir', path.join(root, 'scripts', 'tests', 'fixtures', 'cricket_t20i_filter'),
    '--output', output,
  ])
  const rows = readCsvRows(output)
  const names = rows.map(row => row.player_name).sort()
  assert.ok(names.includes('Pat Cummins'))
  assert.ok(names.includes('Virat Kohli'))
  assert.ok(!names.includes('Domestic Batter'))
  assert.ok(!names.includes('Domestic Bowler'))
}

{
  const output = path.join(tempDir, 'cricket_t20i_live_2024.csv')
  runScript('fetch_cricket.py', [
    '--year', '2024',
    '--type', 't20i',
    '--output', output,
  ])
  const rows = readCsvRows(output)
  const waseem = rows.find(row => row.player_name === 'Waseem Muhammad')
  assert.ok(waseem, 'expected Waseem Muhammad in 2024 T20I export')
  assert.equal(waseem!.runs, '909')
}

{
  const output = path.join(tempDir, 'cricket_odi_live_2024.csv')
  runScript('fetch_cricket.py', [
    '--year', '2024',
    '--type', 'odi',
    '--output', output,
  ])
  const rows = readCsvRows(output)
  const kusal = rows.find(row => row.player_name === 'BKG Mendis' || row.player_name === 'Kusal Mendis')
  assert.ok(kusal, 'expected Kusal Mendis in 2024 ODI export')
  assert.equal(kusal!.runs, '742')
}

console.log('racquet + cricket source filters look safe')
