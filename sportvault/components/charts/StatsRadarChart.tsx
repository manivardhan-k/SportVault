'use client'

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { percentileRank } from '@/lib/percentiles'

interface StatsRadarChartProps {
  summaryStats: Record<string, number | string>
  teamColor: string
  name: string
  excludeKeys?: string[]
  /** Per-stat distribution across the full league cohort. Used to compute percentile ranks. */
  leagueValues: Record<string, number[]>
}

export function StatsRadarChart({ summaryStats, teamColor, name, excludeKeys = ['Games'], leagueValues }: StatsRadarChartProps) {
  const data = Object.entries(summaryStats)
    .filter(([k, v]) => !excludeKeys.includes(k) && typeof v === 'number' && Number(v) > 0)
    .map(([label, value]) => ({ label, value: Number(value) }))

  if (data.length < 3) return null

  const normalized = data.map(d => {
    const dist = leagueValues[d.label] ?? []
    return { ...d, value: percentileRank(d.value, dist, d.label) }
  })

  return (
    <div className="mt-3">
      <p className="mb-1 text-xs" style={{ color: '#9a9894' }}>{name} - percentile profile</p>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={normalized}>
          <PolarGrid stroke="#e4e3df" />
          <PolarAngleAxis dataKey="label" tick={{ fill: '#5a5955', fontSize: 11 }} />
          <Radar dataKey="value" stroke={teamColor} fill={teamColor} fillOpacity={0.25} />
          <Tooltip
            wrapperStyle={{ zIndex: 100 }}
            contentStyle={{ background: '#ffffff', border: '1px solid #e4e3df', borderRadius: 6, fontSize: 12, color: '#111110' }}
            formatter={(_val, _name, entry) => {
              const payload = (entry as { payload?: { label?: string; value?: number } }).payload
              const label = payload?.label ?? ''
              const pct = payload?.value ?? 0
              const raw = summaryStats[label]
              return [`${raw} · ${pct}th pctile`, label]
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
