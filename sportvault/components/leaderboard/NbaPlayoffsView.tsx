'use client'

import { useEffect, useState } from 'react'
import { LeaderboardTable } from './LeaderboardTable'
import { NbaBracketView } from './NbaBracketView'
import { ViewToggle } from './ViewToggle'
import type {
  BracketMatch as BracketMatchType,
  BracketResponse,
  LeaderboardResponse,
} from '@/types/api'
import type { ChartConfig } from '@/types/sport-config'

interface NbaPlayoffsViewProps {
  data: LeaderboardResponse
  bracket: BracketResponse | null
  sport: string
  competition: string
  year: number
  chartConfig: ChartConfig
  accentColor: string
  defaultSortKey: string
  hasTeams?: boolean
  positionBarHeight?: number
  activePosition?: string
}

function allMatches(bracket: BracketResponse | null): BracketMatchType[] {
  if (!bracket) return []
  return [
    ...bracket.left.round1,
    ...bracket.left.semis,
    bracket.left.final,
    ...bracket.right.round1,
    ...bracket.right.semis,
    bracket.right.final,
    bracket.finals,
  ].filter((match): match is BracketMatchType => match !== null)
}

function matchFromHash(bracket: BracketResponse | null): BracketMatchType | null {
  if (!bracket || typeof window === 'undefined') return null
  const hash = window.location.hash
  const match = hash.match(/#match=([^&]+)/)
  if (!match) return null
  const id = decodeURIComponent(match[1])
  return allMatches(bracket).find(item => item.id === id) ?? null
}

export function NbaPlayoffsView({
  data,
  bracket,
  sport,
  competition,
  year,
  chartConfig,
  accentColor,
  defaultSortKey,
  hasTeams = true,
  positionBarHeight = 0,
  activePosition,
}: NbaPlayoffsViewProps) {
  const [view, setView] = useState<'table' | 'bracket'>(() => (bracket ? 'bracket' : 'table'))
  const [selectedMatch, setSelectedMatch] = useState<BracketMatchType | null>(() => matchFromHash(bracket))
  const [matchStats, setMatchStats] = useState<LeaderboardResponse | null>(null)
  const [matchStatsLoading, setMatchStatsLoading] = useState(false)
  const [matchStatsError, setMatchStatsError] = useState<string | null>(null)
  const matchStatsEnabled =
    (sport === 'nba' && competition === 'nba-playoffs') ||
    (sport === 'nfl' && competition === 'nfl-playoffs')

  const handleSelectMatch = (m: BracketMatchType) => {
    setMatchStats(null)
    setMatchStatsError(null)
    setMatchStatsLoading(false)

    if (selectedMatch?.id === m.id) {
      setSelectedMatch(null)
      history.replaceState(null, '', window.location.pathname + window.location.search)
    } else {
      setSelectedMatch(m)
      history.replaceState(null, '', `#match=${encodeURIComponent(m.id)}`)
    }
  }

  const teamFilter = selectedMatch
    ? [selectedMatch.team1.shortName, selectedMatch.team2.shortName]
    : undefined
  const showNflByeNote = sport === 'nfl' && competition === 'nfl-playoffs'

  useEffect(() => {
    const selectedMatchId = selectedMatch?.id
    if (!selectedMatchId || !matchStatsEnabled) return
    const encodedMatchId = encodeURIComponent(selectedMatchId)
    const selectedTeam1Id = selectedMatch.team1.id
    const selectedTeam2Id = selectedMatch.team2.id

    let cancelled = false

    async function loadMatchStats() {
      setMatchStats(null)
      setMatchStatsError(null)
      setMatchStatsLoading(true)
      try {
        const params = new URLSearchParams()
        if (sport === 'nfl') {
          if (activePosition) params.set('position', activePosition)
          params.set('team1Id', String(selectedTeam1Id))
          params.set('team2Id', String(selectedTeam2Id))
        }
        const queryString = params.size > 0 ? `?${params.toString()}` : ''
        const response = await fetch(`/api/${sport}/${competition}/${year}/bracket-match/${encodedMatchId}${queryString}`)
        const json = await response.json() as LeaderboardResponse | { error?: string }
        if (!response.ok) {
          throw new Error('error' in json && json.error ? json.error : 'Unable to load match stats')
        }
        if (!cancelled) setMatchStats(json as LeaderboardResponse)
      } catch (error) {
        if (!cancelled) {
          setMatchStatsError(error instanceof Error ? error.message : 'Unable to load match stats')
        }
      } finally {
        if (!cancelled) setMatchStatsLoading(false)
      }
    }

    void loadMatchStats()

    return () => {
      cancelled = true
    }
  }, [activePosition, competition, matchStatsEnabled, selectedMatch, sport, year])

  return (
    <div>
      <div className="sv-command-strip flex items-center justify-between gap-3 px-3 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <ViewToggle view={view} onChange={setView} accentColor={accentColor} />
          {view === 'bracket' && (
            <span className="hidden text-[10px] uppercase tracking-[0.08em] text-sv-text-muted sm:inline" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
              Select a matchup for box-score stats
            </span>
          )}
        </div>
        {view === 'bracket' && bracket && showNflByeNote && (
          <div
            className="max-w-full rounded-full border px-2.5 py-1 text-right text-[10px] leading-snug"
            style={{
              borderColor: '#e4e3df',
              color: '#7b7872',
              background: '#fbfaf7',
              fontFamily: 'var(--font-dm-sans), sans-serif',
            }}
          >
            BYE = top seed advances automatically; no game played, so it shows 0-0.
          </div>
        )}
      </div>

      {view === 'bracket' && !bracket && (
        <div
          className="px-8 py-16 text-center text-sm"
          style={{ color: '#9a9894', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          Bracket data unavailable for this season.
        </div>
      )}

      {view === 'bracket' && bracket && (
        <>
          <NbaBracketView
            bracket={bracket}
            selectedMatchId={selectedMatch?.id ?? null}
            accentColor={accentColor}
            onSelect={handleSelectMatch}
          />
          {selectedMatch && (
            <div
              className="sv-editorial-panel mt-2 pt-2"
              style={{ borderColor: '#e4e3df' }}
            >
              <div
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-[11px] uppercase tracking-[0.08em] sm:px-8"
                style={{ color: '#9a9894', fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                <span>
                  {selectedMatch.team1.name} vs {selectedMatch.team2.name}
                </span>
                <span
                  className="rounded-full border bg-white px-2.5 py-1"
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  {selectedMatch.team1.wins}-{selectedMatch.team2.wins}
                </span>
              </div>
              {matchStatsEnabled ? (
                <>
                  {matchStatsLoading && (
                    <div
                      className="px-8 py-8 text-center text-[13px]"
                      style={{ color: '#9a9894', fontFamily: 'var(--font-dm-sans), sans-serif' }}
                    >
                      Loading selected match stats...
                    </div>
                  )}
                  {!matchStatsLoading && matchStatsError && (
                    <div
                      className="px-8 py-8 text-center text-[13px]"
                      style={{ color: '#9a9894', fontFamily: 'var(--font-dm-sans), sans-serif' }}
                    >
                      Match stats unavailable: {matchStatsError}
                    </div>
                  )}
                  {!matchStatsLoading && matchStats && (
                    <LeaderboardTable
                      key={`match:${selectedMatch.id}`}
                      data={matchStats}
                      sport={sport}
                      competition={competition}
                      year={year}
                      chartConfig={chartConfig}
                      accentColor={accentColor}
                      defaultSortKey={sport === 'nba' ? 'pts' : defaultSortKey}
                      hasTeams={hasTeams}
                      positionBarHeight={positionBarHeight}
                      showHero={false}
                      enablePlayerDetails={false}
                      enableCompare={false}
                    />
                  )}
                </>
              ) : (
                <LeaderboardTable
                  key={`filtered:${selectedMatch.id}`}
                  data={data}
                  sport={sport}
                  competition={competition}
                  year={year}
                  chartConfig={chartConfig}
                  accentColor={accentColor}
                  defaultSortKey={defaultSortKey}
                  hasTeams={hasTeams}
                  teamFilter={teamFilter}
                  positionBarHeight={positionBarHeight}
                />
              )}
            </div>
          )}
        </>
      )}

      {view === 'table' && (
        <LeaderboardTable
          key={`table:${sport}:${competition}:${year}`}
          data={data}
          sport={sport}
          competition={competition}
          year={year}
          chartConfig={chartConfig}
          accentColor={accentColor}
          defaultSortKey={defaultSortKey}
          hasTeams={hasTeams}
          positionBarHeight={positionBarHeight}
        />
      )}
    </div>
  )
}
