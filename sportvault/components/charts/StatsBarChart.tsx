'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface StatsBarChartProps {
  summaryStats: Record<string, number | string>
  teamColor: string
  name: string
  excludeKeys?: string[]
}

export function StatsBarChart({ summaryStats, teamColor, name, excludeKeys = ['G'] }: StatsBarChartProps) {
  const data = Object.entries(summaryStats)
    .filter(([k, v]) => !excludeKeys.includes(k) && typeof v === 'number' && Number(v) > 0)
    .map(([label, value]) => ({ label, value: Number(value) }))

  if (data.length === 0) return null

  return (
    <div className="mt-3">
      <p className="mb-1 text-xs text-zinc-400">{name} — season totals</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ left: -10 }}>
          <XAxis dataKey="label" tick={{ fill: '#9a9894', fontSize: 11 }} />
          <YAxis tick={{ fill: '#9a9894', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#ffffff', border: '1px solid #e4e3df', borderRadius: 6 }}
            labelStyle={{ color: '#5a5955' }}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={teamColor} fillOpacity={0.85} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
