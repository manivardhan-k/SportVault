'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { ChartDataPoint } from '@/types/api'

interface F1SeasonLineChartProps {
  data: ChartDataPoint[]
  teamColor: string
  driverName: string
  dualMode?: boolean  // true = position mode, false/undefined = cumulative points
}

export function F1SeasonLineChart({ data, teamColor, driverName, dualMode }: F1SeasonLineChartProps) {
  const isPosMode = !!dualMode

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 16, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e3df" />
        <XAxis
          dataKey="label"
          stroke="#e4e3df"
          tick={{ fontSize: 11, fill: '#9a9894' }}
          label={{ value: 'Round', position: 'insideBottom', offset: -8, fill: '#9a9894', fontSize: 11 }}
        />
        <YAxis
          stroke="#e4e3df"
          tick={{ fontSize: 11, fill: '#9a9894' }}
          reversed={isPosMode}
          domain={isPosMode ? [1, 20] : undefined}
        />
        <Tooltip
          contentStyle={{ background: '#ffffff', border: '1px solid #e4e3df', borderRadius: 4, fontSize: 12 }}
          labelStyle={{ color: '#9a9894' }}
          labelFormatter={label => `Round ${label}`}
        />
        {/* Both lines always mounted — toggle hide to avoid remount jank */}
        <Line
          type="monotone"
          dataKey="points"
          hide={isPosMode}
          stroke={teamColor}
          strokeWidth={2}
          dot={{ r: 3, fill: teamColor }}
          activeDot={{ r: 5 }}
          name={driverName}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="position"
          hide={!isPosMode}
          stroke={teamColor}
          strokeWidth={2}
          dot={{ r: 3, fill: teamColor }}
          activeDot={{ r: 5 }}
          name={driverName}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
