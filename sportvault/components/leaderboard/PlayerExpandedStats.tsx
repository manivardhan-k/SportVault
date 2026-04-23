'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { PlayerStatsResponse } from '@/types/api'
import type { ChartConfig } from '@/types/sport-config'
import { F1SeasonLineChart } from '@/components/charts/F1SeasonLineChart'
import { StatsRadarChart } from '@/components/charts/StatsRadarChart'
import { StatsBarChart } from '@/components/charts/StatsBarChart'
import { NflQbScatterChart } from '@/components/charts/NflQbScatterChart'
import { NflWeeklyBarChart } from '@/components/charts/NflWeeklyBarChart'

interface PlayerExpandedStatsProps {
  stats: PlayerStatsResponse | null
  loading: boolean
  chartConfig: ChartConfig
  accentColor: string
  onClose: () => void
  /** When true, renders bare content (no tr/td wrapper) for use outside a table */
  inline?: boolean
}

const SKIP_KEYS = new Set(['position', 'rank', 'season'])

export function PlayerExpandedStats({ stats, loading, chartConfig, accentColor, onClose, inline }: PlayerExpandedStatsProps) {
  const [chartMode, setChartMode] = useState<'pts' | 'pos'>('pts')
  const shouldReduce = useReducedMotion()

  const innerContent = (
    <div className="px-6 py-[14px] flex gap-8 items-start">
            {loading && (
              <div className="flex items-center gap-2 py-4">
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                <span className="text-sm" style={{ color: '#9a9894' }}>Loading...</span>
              </div>
            )}

            {stats && !loading && (
              <>
                {/* Left: stat chips */}
                <div className="flex flex-col gap-[6px] flex-shrink-0">
                  <div
                    className="text-[9px] uppercase tracking-[0.08em] mb-[2px]"
                    style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
                  >
                    SEASON STATS
                  </div>
                  <div className="grid gap-[6px]" style={{ gridTemplateColumns: 'repeat(3, auto)' }}>
                    {Object.entries(stats.summaryStats)
                      .filter(([k, v]) => !SKIP_KEYS.has(k) && v !== 0 && v !== null && v !== undefined && v !== '')
                      .map(([k, v]) => (
                        <div
                          key={k}
                          className="rounded-[5px] px-[10px] py-[5px] min-w-[52px]"
                          style={{ background: '#ffffff', border: '1px solid #e4e3df' }}
                        >
                          <div
                            className="text-[9px] uppercase tracking-[0.06em] mb-[2px]"
                            style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
                          >
                            {k.replace(/_/g, ' ')}
                          </div>
                          <div
                            className="text-[15px] font-semibold"
                            style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#111110' }}
                          >
                            {v}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Right: chart */}
                <div className="flex-1 min-w-0">
                  {/* Chart title */}
                  {chartConfig.label && (
                    <div
                      className="text-[9px] uppercase tracking-[0.08em] mb-[6px]"
                      style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
                    >
                      {chartConfig.type === 'line'
                        ? (chartMode === 'pts' ? 'CUMULATIVE POINTS BY ROUND' : 'FINISH POSITION BY ROUND')
                        : chartConfig.type === 'line+radar'
                          ? `STAT PROFILE — ${stats.name.toUpperCase()}`
                          : chartConfig.label.toUpperCase()}
                    </div>
                  )}

                  {/* F1-only mode toggle */}
                  {chartConfig.dualMode && (
                    <div className="flex gap-2 mb-3">
                      {(['pts', 'pos'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setChartMode(mode)}
                          className="text-xs font-medium px-2 py-0.5 rounded transition-colors duration-150"
                          style={{
                            fontFamily: 'var(--font-dm-mono), monospace',
                            background: chartMode === mode ? accentColor : 'transparent',
                            color: chartMode === mode ? '#ffffff' : '#9a9894',
                            border: `1px solid ${chartMode === mode ? accentColor : '#e4e3df'}`,
                          }}
                        >
                          {mode === 'pts' ? 'Cumulative Points' : 'Finish Positions'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Charts */}
                  {stats.chartData.length > 0 && chartConfig.type === 'line' && (
                    <F1SeasonLineChart
                      data={stats.chartData}
                      teamColor={stats.team.colorPrimary}
                      driverName={stats.name}
                      dualMode={chartMode === 'pos'}
                    />
                  )}
                  {chartConfig.type === 'line+radar' && (
                    <StatsRadarChart
                      summaryStats={stats.summaryStats}
                      teamColor={stats.team.colorPrimary}
                      name={stats.name}
                    />
                  )}
                  {chartConfig.type === 'bar' && stats.chartData.length > 0 && (
                    <NflWeeklyBarChart
                      data={stats.chartData as { label: string; value: number }[]}
                      teamColor={stats.team.colorPrimary}
                      statLabel={stats.scatterData ? 'Pass Yds' : 'Yds'}
                      name={stats.name}
                    />
                  )}
                  {chartConfig.type === 'bar' && stats.chartData.length === 0 && !stats.scatterData && (
                    <StatsBarChart
                      summaryStats={stats.summaryStats}
                      teamColor={stats.team.colorPrimary}
                      name={stats.name}
                    />
                  )}
                  {stats.scatterData && stats.scatterData.length > 0 && stats.scatterAxes && (
                    <NflQbScatterChart
                      data={stats.scatterData}
                      axes={stats.scatterAxes}
                      selectedName={stats.name}
                    />
                  )}

                  {/* Compare placeholder */}
                  <div className="mt-3 text-right">
                    <button
                      className="text-xs cursor-not-allowed opacity-30 select-none"
                      style={{ color: '#9a9894' }}
                      disabled
                      title="Coming soon"
                    >
                      + Compare
                    </button>
                  </div>
                </div>
              </>
            )}
    </div>
  )

  if (inline) {
    return <div style={{ background: '#faf9f7' }}>{innerContent}</div>
  }

  return (
    <tr>
      <td
        colSpan={99}
        style={{ borderTop: '1px solid #e4e3df', borderBottom: '1px solid #e4e3df', padding: 0 }}
      >
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={shouldReduce ? { duration: 0 } : { duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
          style={{ overflow: 'hidden', background: '#faf9f7' }}
        >
          {innerContent}
        </motion.div>
      </td>
    </tr>
  )
}
