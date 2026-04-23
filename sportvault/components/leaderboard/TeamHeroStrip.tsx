'use client'

const teamStatsBySport: Record<string, Array<{ key: string; label: string }>> = {
  f1:     [{ key: 'points', label: 'PTS' }, { key: 'wins', label: 'W' }, { key: 'podiums', label: 'POD' }],
  soccer: [{ key: 'goals', label: 'G' }, { key: 'assists', label: 'A' }],
  nfl:    [{ key: 'passing_yards', label: 'Pass YDS' }, { key: 'passing_tds', label: 'TD' }],
  nba:    [{ key: 'ppg', label: 'PPG' }],
}

interface TeamHeroStripProps {
  teamName: string
  teamColor: string
  accentColor: string
  sport: string
  teamStats: Record<string, number>
  playerCount: number
}

export function TeamHeroStrip({ teamName, teamColor, accentColor, sport, teamStats }: TeamHeroStripProps) {
  const statDefs = teamStatsBySport[sport] ?? []

  return (
    <div
      className="bg-sv-surface sticky top-0 z-[9] flex-shrink-0 flex items-center h-[40px] px-6"
      style={{ borderBottom: `1px solid #e4e3df`, borderLeft: `5px solid ${teamColor}` }}
    >
      {/* Champion badge */}
      <div className="flex items-center gap-[6px] mr-3">
        <span
          className="text-[10px] tracking-[0.06em]"
          style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
        >
          T1
        </span>
        <div className="w-[6px] h-[6px] rounded-full" style={{ background: accentColor }} />
      </div>

      {/* Team name */}
      <span
        className="text-[13px] font-semibold mr-4"
        style={{ color: '#111110' }}
      >
        {teamName}
      </span>

      <div className="w-px h-[16px] bg-sv-divider mr-4" />

      {/* Aggregated stats */}
      <div className="flex items-center gap-4">
        {statDefs.map(s => (
          <div key={s.key} className="flex items-baseline gap-1">
            <span
              className="text-[13px] font-semibold"
              style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#111110' }}
            >
              {teamStats[s.key] ?? '—'}
            </span>
            <span
              className="text-[10px]"
              style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
