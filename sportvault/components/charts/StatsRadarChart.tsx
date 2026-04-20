'use client'

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface StatsRadarChartProps {
  summaryStats: Record<string, number | string>
  teamColor: string
  name: string
  excludeKeys?: string[]
}

export function StatsRadarChart({ summaryStats, teamColor, name, excludeKeys = ['Games'] }: StatsRadarChartProps) {
  const data = Object.entries(summaryStats)
    .filter(([k, v]) => !excludeKeys.includes(k) && typeof v === 'number' && Number(v) > 0)
    .map(([label, value]) => ({ label, value: Number(value) }))

  if (data.length < 3) return null

  const max = Math.max(...data.map(d => d.value))
  const normalized = data.map(d => ({ ...d, value: Math.round((d.value / max) * 100) }))

  return (
    <div className="mt-3">
      <p className="mb-1 text-xs text-zinc-400">{name} — stat profile</p>
      <ResponsiveContainer width="100%" height={200}>
        <RadarChart data={normalized}>
          <PolarGrid stroke="#3f3f46" />
          <PolarAngleAxis dataKey="label" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
          <Radar dataKey="value" stroke={teamColor} fill={teamColor} fillOpacity={0.25} />
          <Tooltip
            contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 6 }}
            formatter={(_val, _name, entry) => {
              const label = (entry as { payload?: { label?: string } }).payload?.label ?? ''
              return [summaryStats[label] ?? _val, label]
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
