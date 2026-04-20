'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { ChartDataPoint } from '@/types/api'

interface F1SeasonLineChartProps {
  data: ChartDataPoint[]
  teamColor: string
  driverName: string
  dualMode?: boolean
}

export function F1SeasonLineChart({ data, teamColor, driverName, dualMode }: F1SeasonLineChartProps) {
  const [mode, setMode] = useState<'points' | 'position'>('points')

  return (
    <div>
      {dualMode && (
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setMode('points')}
            className={`rounded px-3 py-1 text-xs transition-colors ${mode === 'points' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            Cumulative Points
          </button>
          <button
            onClick={() => setMode('position')}
            className={`rounded px-3 py-1 text-xs transition-colors ${mode === 'position' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            Finish Positions
          </button>
        </div>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 16, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis
            dataKey="label"
            stroke="#555"
            tick={{ fontSize: 11, fill: '#888' }}
            label={{ value: 'Round', position: 'insideBottom', offset: -8, fill: '#666', fontSize: 11 }}
          />
          <YAxis
            stroke="#555"
            tick={{ fontSize: 11, fill: '#888' }}
            reversed={mode === 'position'}
            domain={mode === 'position' ? [1, 20] : undefined}
          />
          <Tooltip
            contentStyle={{ background: '#1c1c1c', border: '1px solid #444', borderRadius: 6, fontSize: 12 }}
            labelFormatter={label => `Round ${label}`}
          />
          <Line
            type="monotone"
            dataKey={mode}
            stroke={teamColor}
            strokeWidth={2}
            dot={{ r: 3, fill: teamColor }}
            activeDot={{ r: 5 }}
            name={driverName}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
