import { prisma } from '@/lib/db'
import type { BracketMatch, BracketResponse } from '@/types/api'

const NBA_TEAM_NAMES: Record<string, string> = {
  'ATL': 'Atlanta Hawks', 'BOS': 'Boston Celtics', 'BKN': 'Brooklyn Nets', 'CHA': 'Charlotte Hornets',
  'CHI': 'Chicago Bulls', 'CLE': 'Cleveland Cavaliers', 'DAL': 'Dallas Mavericks', 'DEN': 'Denver Nuggets',
  'DET': 'Detroit Pistons', 'GSW': 'Golden State Warriors', 'HOU': 'Houston Rockets', 'IND': 'Indiana Pacers',
  'LAC': 'Los Angeles Clippers', 'LAL': 'Los Angeles Lakers', 'MEM': 'Memphis Grizzlies', 'MIA': 'Miami Heat',
  'MIL': 'Milwaukee Bucks', 'MIN': 'Minnesota Timberwolves', 'NOP': 'New Orleans Pelicans', 'NYK': 'New York Knicks',
  'OKC': 'Oklahoma City Thunder', 'ORL': 'Orlando Magic', 'PHI': 'Philadelphia 76ers', 'PHX': 'Phoenix Suns',
  'POR': 'Portland Trail Blazers', 'SAC': 'Sacramento Kings', 'SAS': 'San Antonio Spurs', 'TOR': 'Toronto Raptors',
  'UTA': 'Utah Jazz', 'WAS': 'Washington Wizards',
}

export async function getNbaBracket(year: number): Promise<BracketResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: 'nba-playoffs' }, year },
  })
  if (!season) throw new Error(`No NBA playoffs for ${year}`)

  const series = await prisma.nbaPlayoffSeries.findMany({
    where: { seasonId: season.id },
    include: { team1: true, team2: true },
    orderBy: [{ roundNumber: 'asc' }, { conference: 'asc' }, { seriesOrder: 'asc' }],
  })

  const toMatch = (s: (typeof series)[number]): BracketMatch => {
    const t1Abbr = s.team1.shortName ?? s.team1.name
    const t2Abbr = s.team2.shortName ?? s.team2.name
    const t1IsWinner = s.winnerTeamId === s.team1Id
    const t2IsWinner = s.winnerTeamId === s.team2Id

    return {
      id: `${s.roundNumber}-${s.conference}-${s.seriesOrder}`,
      round: s.roundNumber,
      conference: s.conference,
      seriesOrder: s.seriesOrder,
      winnerTeamId: s.winnerTeamId,
      team1: {
        id: s.team1Id,
        shortName: t1Abbr,
        name: NBA_TEAM_NAMES[t1Abbr] ?? s.team1.name,
        colorPrimary: s.team1.colorPrimary ?? '#888888',
        colorSecondary: s.team1.colorSecondary ?? '#888888',
        wins: s.team1Wins,
        isWinner: t1IsWinner,
      },
      team2: {
        id: s.team2Id,
        shortName: t2Abbr,
        name: NBA_TEAM_NAMES[t2Abbr] ?? s.team2.name,
        colorPrimary: s.team2.colorPrimary ?? '#888888',
        colorSecondary: s.team2.colorSecondary ?? '#888888',
        wins: s.team2Wins,
        isWinner: t2IsWinner,
      },
      isComplete: s.winnerTeamId !== null,
    }
  }

  const matches = series.map(toMatch)

  const eastR1 = matches.filter(m => m.round === 1 && m.conference === 'East')
  const eastSemis = matches.filter(m => m.round === 2 && m.conference === 'East')
  const eastFinal = matches.find(m => m.round === 3 && m.conference === 'East') ?? null

  const westR1 = matches.filter(m => m.round === 1 && m.conference === 'West')
  const westSemis = matches.filter(m => m.round === 2 && m.conference === 'West')
  const westFinal = matches.find(m => m.round === 3 && m.conference === 'West') ?? null

  const finals = matches.find(m => m.round === 4) ?? null

  return {
    sport: 'nba',
    year,
    left: {
      label: 'East',
      round1Label: 'R1',
      semisLabel: 'CSF',
      finalLabel: 'CF',
      round1: eastR1,
      semis: eastSemis,
      final: eastFinal,
    },
    right: {
      label: 'West',
      round1Label: 'R1',
      semisLabel: 'CSF',
      finalLabel: 'CF',
      round1: westR1,
      semis: westSemis,
      final: westFinal,
    },
    finalsLabel: 'Finals',
    finals,
  }
}
