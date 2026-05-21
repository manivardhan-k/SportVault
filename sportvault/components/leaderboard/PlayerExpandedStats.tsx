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

import { fmtVal } from '@/lib/format'

interface PlayerExpandedStatsProps {
  stats: PlayerStatsResponse | null
  loading: boolean
  chartConfig: ChartConfig
  accentColor: string
  leagueValues: Record<string, number[]>
  onClose: () => void
  /** When true, renders bare content (no tr/td wrapper) for use outside a table */
  inline?: boolean
}

const SKIP_KEYS = new Set(['position', 'rank', 'season'])

export function PlayerExpandedStats({ stats, loading, chartConfig, accentColor, leagueValues, onClose: _onClose, inline }: PlayerExpandedStatsProps) {
  const [chartMode, setChartMode] = useState<'pts' | 'pos'>('pts')
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const shouldReduce = useReducedMotion()
  void _onClose

  const activeChartTab = stats?.chartTabs?.find(tab => tab.key === activeTab) ?? stats?.chartTabs?.[0] ?? null

  const innerContent = (
    <div className="flex flex-col items-stretch gap-4 px-3 py-[14px] sm:px-6 md:flex-row md:items-start md:gap-8">
            {loading && (
              <div className="flex items-center gap-2 py-4">
                <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                <span className="text-sm" style={{ color: '#9a9894' }}>Loading...</span>
              </div>
            )}

            {stats && !loading && (
              <>
                {/* Left: stat chips */}
                <div className="flex flex-shrink-0 flex-col gap-[6px]">
                  <div
                    className="text-[9px] uppercase tracking-[0.08em] mb-[2px]"
                    style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
                  >
                    SEASON STATS
                  </div>
                  <div className="grid grid-cols-3 gap-[6px]">
                    {Object.entries(stats.summaryStats)
                      .filter(([k, v]) => !SKIP_KEYS.has(k) && v !== 0 && v !== null && v !== undefined && v !== '')
                      .map(([k, v]) => (
                        <div
                          key={k}
                          className="min-w-[52px] rounded-[6px] px-[10px] py-[6px]"
                          style={{ background: '#ffffff', border: '1px solid #e4e3df', boxShadow: '0 1px 0 rgba(17,17,16,0.03)' }}
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
                            {fmtVal(v, k)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Right: chart */}
                <div className="min-w-0 flex-1 rounded-[8px] border border-sv-divider bg-white p-3">
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
                    <div className="mb-3 flex gap-2">
                      {(['pts', 'pos'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setChartMode(mode)}
                          className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-150"
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
                      key={chartMode}
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
                      excludeKeys={chartConfig.excludeKeys}
                      leagueValues={leagueValues}
                    />
                  )}
                  {chartConfig.type === 'radar' && (
                    <StatsRadarChart
                      summaryStats={stats.summaryStats}
                      teamColor={stats.team.colorPrimary}
                      name={stats.name}
                      excludeKeys={chartConfig.excludeKeys}
                      leagueValues={leagueValues}
                    />
                  )}
                  {chartConfig.type === 'radar+bar' && (
                    <div className="flex flex-col gap-4">
                      <StatsRadarChart
                        summaryStats={stats.summaryStats}
                        teamColor={stats.team.colorPrimary}
                        name={stats.name}
                        leagueValues={leagueValues}
                      />
                      <StatsBarChart
                        summaryStats={{}}
                        data={(stats.secondaryChartData ?? []).map(point => ({
                          label: String(point.label),
                          value: Number(point.value ?? 0),
                        }))}
                        teamColor={stats.team.colorPrimary}
                        name={stats.name}
                        title={`${stats.name} — surface win %`}
                      />
                    </div>
                  )}
                  {chartConfig.type === 'radar-tabs' && activeChartTab && (
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        {(stats.chartTabs ?? []).map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-150"
                            style={{
                              fontFamily: 'var(--font-dm-mono), monospace',
                              background: activeChartTab.key === tab.key ? accentColor : 'transparent',
                              color: activeChartTab.key === tab.key ? '#ffffff' : '#9a9894',
                              border: `1px solid ${activeChartTab.key === tab.key ? accentColor : '#e4e3df'}`,
                            }}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <StatsRadarChart
                        summaryStats={activeChartTab.summaryStats}
                        teamColor={stats.team.colorPrimary}
                        name={stats.name}
                        excludeKeys={['Mat', 'Inn', 'Matches', 'Innings']}
                        leagueValues={leagueValues}
                      />
                    </div>
                  )}
                  {chartConfig.type === 'bar-tabs' && activeChartTab && (
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        {(stats.chartTabs ?? []).map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className="rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-150"
                            style={{
                              fontFamily: 'var(--font-dm-mono), monospace',
                              background: activeChartTab.key === tab.key ? accentColor : 'transparent',
                              color: activeChartTab.key === tab.key ? '#ffffff' : '#9a9894',
                              border: `1px solid ${activeChartTab.key === tab.key ? accentColor : '#e4e3df'}`,
                            }}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <StatsBarChart
                        summaryStats={activeChartTab.summaryStats}
                        data={(activeChartTab.chartData ?? []).map(point => ({
                          label: String(point.label),
                          value: Number(point.value ?? 0),
                          description: typeof point.description === 'string' ? point.description : undefined,
                        }))}
                        teamColor={stats.team.colorPrimary}
                        name={stats.name}
                        title={activeChartTab.title ?? `${stats.name} — match by match`}
                      />
                    </div>
                  )}
                  {chartConfig.type === 'bar' && stats.chartData.length > 0 && !stats.scatterData && (
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
                </div>
              </>
            )}
    </div>
  )

  if (inline) {
    return <div style={{ background: '#fbfaf7' }}>{innerContent}</div>
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
          style={{ overflow: 'hidden', background: '#fbfaf7' }}
        >
          {innerContent}
        </motion.div>
      </td>
    </tr>
  )
}
