'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

interface NflWeeklyBarChartProps {
  data: { label: string; value: number }[]
  teamColor: string
  statLabel: string
  name: string
}

export function NflWeeklyBarChart({ data, teamColor, statLabel, name }: NflWeeklyBarChartProps) {
  if (data.length === 0) return null

  const avg = data.reduce((s, d) => s + d.value, 0) / data.length

  return (
    <div className="mt-3">
      <p className="mb-1 text-xs" style={{ color: '#9a9894' }}>{name} - {statLabel} per week</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ left: -10 }}>
          <XAxis dataKey="label" tick={{ fill: '#9a9894', fontSize: 10 }} />
          <YAxis tick={{ fill: '#9a9894', fontSize: 11 }} />
          <Tooltip
            wrapperStyle={{ zIndex: 100 }}
            contentStyle={{ background: '#ffffff', border: '1px solid #e4e3df', borderRadius: 6 }}
            labelStyle={{ color: '#5a5955' }}
            formatter={(v) => [v, statLabel]}
          />
          <ReferenceLine y={avg} stroke="#d4d3cf" strokeDasharray="4 2" label={{ value: 'avg', fill: '#9a9894', fontSize: 10 }} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={teamColor} fillOpacity={0.8} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
