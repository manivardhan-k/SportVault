'use client'

import type { PlayerStatsResponse } from '@/types/api'
import type { ChartConfig } from '@/types/sport-config'
import { F1SeasonLineChart } from '@/components/charts/F1SeasonLineChart'
import { StatsRadarChart } from '@/components/charts/StatsRadarChart'
import { StatsBarChart } from '@/components/charts/StatsBarChart'

interface PlayerExpandedStatsProps {
  stats: PlayerStatsResponse | null
  loading: boolean
  chartConfig: ChartConfig
  onClose: () => void
}

export function PlayerExpandedStats({ stats, loading, chartConfig, onClose }: PlayerExpandedStatsProps) {
  return (
    <tr>
      <td colSpan={99} className="bg-zinc-900/80 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {loading && (
              <p className="text-sm text-zinc-400">Loading...</p>
            )}
            {stats && !loading && (
              <div>
                <div className="mb-4 flex flex-wrap gap-3">
                  {Object.entries(stats.summaryStats).map(([k, v]) => (
                    <div key={k} className="rounded bg-zinc-800 px-3 py-2 text-center min-w-[60px]">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{k}</p>
                      <p className="mt-0.5 text-base font-bold">{v}</p>
                    </div>
                  ))}
                </div>
                {stats.chartData.length > 0 && chartConfig.type === 'line' && (
                  <F1SeasonLineChart
                    data={stats.chartData}
                    teamColor={stats.team.colorPrimary}
                    driverName={stats.name}
                    dualMode={chartConfig.dualMode}
                  />
                )}
                {chartConfig.type === 'line+radar' && (
                  <StatsRadarChart
                    summaryStats={stats.summaryStats}
                    teamColor={stats.team.colorPrimary}
                    name={stats.name}
                  />
                )}
                {chartConfig.type === 'bar' && (
                  <StatsBarChart
                    summaryStats={stats.summaryStats}
                    teamColor={stats.team.colorPrimary}
                    name={stats.name}
                  />
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-zinc-500 hover:text-white text-sm transition-colors"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  )
}
