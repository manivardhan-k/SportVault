'use client'

import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, LabelList,
} from 'recharts'
import type { ScatterDataPoint } from '@/types/api'

interface NflQbScatterChartProps {
  data: ScatterDataPoint[]
  axes: { x: string; y: string }
  selectedName: string
}

function CustomDot(props: { cx?: number; cy?: number; payload?: ScatterDataPoint }) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null || !payload) return null
  if (payload.isSelected) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={9} fill={payload.color} opacity={1} stroke="#fff" strokeWidth={2} />
      </g>
    )
  }
  return <circle cx={cx} cy={cy} r={5} fill={payload.color} opacity={0.55} />
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterDataPoint }> }) {
  if (!active || !payload?.length) return null
  const d: ScatterDataPoint = payload[0].payload
  return (
    <div className="rounded border px-3 py-2 text-xs shadow-lg" style={{ background: '#ffffff', borderColor: '#e4e3df' }}>
      <p className="font-semibold" style={{ color: '#111110' }}>{d.name}</p>
      <p style={{ color: '#9a9894' }}>Pass Yds: <span style={{ color: '#5a5955' }}>{d.x.toLocaleString()}</span></p>
      <p style={{ color: '#9a9894' }}>TD/INT: <span style={{ color: '#5a5955' }}>{d.y}</span></p>
    </div>
  )
}

export function NflQbScatterChart({ data, axes, selectedName }: NflQbScatterChartProps) {
  const avgX = data.reduce((s, d) => s + d.x, 0) / data.length
  const avgY = data.reduce((s, d) => s + d.y, 0) / data.length

  return (
    <div className="mt-3">
      <p className="mb-1 text-xs" style={{ color: '#9a9894' }}>
        QB Efficiency - {axes.x} vs {axes.y}
        <span className="ml-2 opacity-70">{selectedName} highlighted; dashed lines = league avg</span>
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <XAxis
            dataKey="x"
            type="number"
            name={axes.x}
            tick={{ fill: '#9a9894', fontSize: 11 }}
            tickFormatter={v => `${(v / 1000).toFixed(1)}k`}
            domain={['auto', 'auto']}
          />
          <YAxis
            dataKey="y"
            type="number"
            name={axes.y}
            tick={{ fill: '#9a9894', fontSize: 11 }}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 100 }} />
          <ReferenceLine x={avgX} stroke="#d4d3cf" strokeDasharray="4 3" />
          <ReferenceLine y={avgY} stroke="#d4d3cf" strokeDasharray="4 3" />
          <Scatter data={data} shape={<CustomDot />}>
            <LabelList
              dataKey="name"
              position="top"
              style={{ fontSize: 9, fill: '#9a9894' }}
              formatter={(v) => {
                const s = String(v)
                const parts = s.split(' ')
                return parts[parts.length - 1]
              }}
            />
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="mt-1 flex gap-4 text-[10px]" style={{ color: '#9a9894' }}>
        <span>Top-right = high volume and efficient</span>
        <span>Bottom-left = low volume and turnover-prone</span>
      </div>
    </div>
  )
}
