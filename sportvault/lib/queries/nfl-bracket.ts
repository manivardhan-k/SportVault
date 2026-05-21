import { prisma } from '../db'
import type { BracketMatch, BracketResponse } from '../../types/api'

function matchTeamRef(team: {
  id: number
  name: string
  shortName: string | null
  colorPrimary: string | null
  colorSecondary: string | null
}, score: number, isWinner: boolean) {
  return {
    id: team.id,
    shortName: team.shortName ?? team.name,
    name: team.name,
    colorPrimary: team.colorPrimary ?? '#888888',
    colorSecondary: team.colorSecondary ?? '#888888',
    wins: score,
    isWinner,
  }
}

function insertByeMatch(wildCards: BracketMatch[], divisionals: BracketMatch[], conference: string): BracketMatch[] {
  if (wildCards.length === 0 || divisionals.length === 0) return wildCards
  
  const divTeams = divisionals.flatMap(m => [m.team1, m.team2])
  const wcWinners = new Set(wildCards.map(m => m.winnerTeamId).filter(Boolean))
  const byeTeam = divTeams.find(t => !wcWinners.has(t.id))
  
  if (byeTeam) {
    const topSeedAdvance = {
      ...byeTeam,
      wins: 0,
      isWinner: true,
    }

    const byeMatch: BracketMatch = {
      id: `bye-${conference}`,
      round: 1,
      conference,
      seriesOrder: 0,
      winnerTeamId: byeTeam.id,
      team1: topSeedAdvance,
      team2: {
        ...byeTeam,
        id: -1,
        name: 'BYE',
        shortName: 'BYE',
        colorPrimary: '#333333',
        colorSecondary: '#333333',
        wins: 0,
        isWinner: false,
      },
      isComplete: true,
    }
    return [byeMatch, ...wildCards]
  }
  return wildCards
}

/**
 * Sorts Wild Card and Divisional games for an NFL conference to guarantee non-crossing connector lines.
 *
 * Visual layout expectations:
 * - Divisional game 0 (top) feeds from Wild Card games at indices 0 and 1.
 * - Divisional game 1 (bottom) feeds from Wild Card games at indices 2 and 3.
 *
 * Logic:
 * 1. Find the BYE match (where the #1 seed advances automatically).
 * 2. Divisional Game 0 is the one featuring the #1 seed.
 * 3. Divisional Game 1 is the other game.
 * 4. Wild Card index 0 is the BYE match.
 * 5. Wild Card index 1 is the match whose winner plays the #1 seed in Divisional Game 0.
 * 6. Wild Card indices 2 & 3 are the other two Wild Card games whose winners play in Divisional Game 1.
 */
function sortNflConferenceBracket(
  wildCards: BracketMatch[],
  divisionals: BracketMatch[]
): { sortedWildCards: BracketMatch[]; sortedDivisionals: BracketMatch[] } {
  if (wildCards.length === 0 || divisionals.length === 0) {
    return { sortedWildCards: wildCards, sortedDivisionals: divisionals }
  }

  // 1. Find the BYE match (where team2.id === -1 or name/shortName is "BYE")
  const byeMatch = wildCards.find(m => m.team2.id === -1 || m.team2.shortName === 'BYE')
  if (!byeMatch) {
    return { sortedWildCards: wildCards, sortedDivisionals: divisionals }
  }

  const byeTeamId = byeMatch.winnerTeamId

  // 2. Sort divisionals:
  // Game 0: Divisional game containing the #1 seed
  // Game 1: The other Divisional game
  const divGame0 = divisionals.find(m => m.team1.id === byeTeamId || m.team2.id === byeTeamId)
  const divGame1 = divisionals.find(m => m !== divGame0)

  const sortedDivisionals: BracketMatch[] = []
  if (divGame0) sortedDivisionals.push(divGame0)
  if (divGame1) sortedDivisionals.push(divGame1)
  
  // Safeguard: fill in any remaining divisional matches if they exist
  for (const dg of divisionals) {
    if (!sortedDivisionals.includes(dg)) {
      sortedDivisionals.push(dg)
    }
  }

  // 3. Sort wildCards:
  // - Index 0: The BYE match
  // - Index 1: The Wild Card match whose winner plays the #1 seed in Divisional Game 0
  // - Indices 2 & 3: The other two Wild Card matches
  let opponentId: number | null = null
  if (divGame0) {
    opponentId = divGame0.team1.id === byeTeamId ? divGame0.team2.id : divGame0.team1.id
  }

  const wcForDiv0 = opponentId !== null 
    ? wildCards.find(m => m.winnerTeamId === opponentId) 
    : undefined

  const otherWcGames = wildCards.filter(m => m !== byeMatch && m !== wcForDiv0)

  const sortedWildCards: BracketMatch[] = []
  sortedWildCards.push(byeMatch)
  if (wcForDiv0) sortedWildCards.push(wcForDiv0)
  sortedWildCards.push(...otherWcGames)

  // Safeguard: fill in any remaining wild card matches if they exist
  for (const wc of wildCards) {
    if (!sortedWildCards.includes(wc)) {
      sortedWildCards.push(wc)
    }
  }

  // 4. Update the seriesOrder and ID of both Wild Cards and Divisionals so they match the visual grid!
  const updatedWildCards = sortedWildCards.map((wc, idx) => {
    const seriesOrder = idx + 1
    return {
      ...wc,
      seriesOrder,
      id: `${wc.round}-${wc.conference}-${seriesOrder}`,
    }
  })

  const updatedDivisionals = sortedDivisionals.map((dg, idx) => {
    const seriesOrder = idx + 1
    return {
      ...dg,
      seriesOrder,
      id: `${dg.round}-${dg.conference}-${seriesOrder}`,
    }
  })

  return { sortedWildCards: updatedWildCards, sortedDivisionals: updatedDivisionals }
}

export async function getNflBracket(year: number): Promise<BracketResponse> {
  const season = await prisma.season.findFirst({
    where: { competition: { slug: 'nfl-playoffs' }, year },
  })
  if (!season) throw new Error(`No NFL playoffs for ${year}`)

  const games = await prisma.nflPlayoffGame.findMany({
    where: { seasonId: season.id },
    include: { team1: true, team2: true },
    orderBy: [{ roundNumber: 'asc' }, { conference: 'asc' }, { gameOrder: 'asc' }],
  })

  const matches = games.map((game): BracketMatch => ({
    id: game.eventId ?? `${game.roundNumber}-${game.conference}-${game.gameOrder}`,
    round: game.roundNumber,
    conference: game.conference,
    seriesOrder: game.gameOrder,
    winnerTeamId: game.winnerTeamId,
    team1: matchTeamRef(game.team1, game.team1Score, game.winnerTeamId === game.team1Id),
    team2: matchTeamRef(game.team2, game.team2Score, game.winnerTeamId === game.team2Id),
    isComplete: game.winnerTeamId !== null,
  }))

  let afcWildCard = matches.filter(match => match.round === 1 && match.conference === 'AFC')
  const afcDivisional = matches.filter(match => match.round === 2 && match.conference === 'AFC')
  const afcFinal = matches.find(match => match.round === 3 && match.conference === 'AFC') ?? null

  let nfcWildCard = matches.filter(match => match.round === 1 && match.conference === 'NFC')
  const nfcDivisional = matches.filter(match => match.round === 2 && match.conference === 'NFC')
  const nfcFinal = matches.find(match => match.round === 3 && match.conference === 'NFC') ?? null

  // Inject dummy BYE matches
  afcWildCard = insertByeMatch(afcWildCard, afcDivisional, 'AFC')
  nfcWildCard = insertByeMatch(nfcWildCard, nfcDivisional, 'NFC')

  // Apply visual layout sorting to prevent crossing/overlapping lines
  const sortedAfc = sortNflConferenceBracket(afcWildCard, afcDivisional)
  const sortedNfc = sortNflConferenceBracket(nfcWildCard, nfcDivisional)

  // Normalize final match IDs and seriesOrder for completeness
  const updatedAfcFinal = afcFinal
    ? {
        ...afcFinal,
        seriesOrder: 1,
        id: `3-AFC-1`,
      }
    : null

  const updatedNfcFinal = nfcFinal
    ? {
        ...nfcFinal,
        seriesOrder: 1,
        id: `3-NFC-1`,
      }
    : null

  const superBowl = matches.find(match => match.round === 4 || match.conference === 'Finals') ?? null
  const updatedSuperBowl = superBowl
    ? {
        ...superBowl,
        seriesOrder: 1,
        id: `4-Finals-1`,
      }
    : null

  return {
    sport: 'nfl',
    year,
    left: {
      label: 'AFC',
      round1Label: 'WC',
      semisLabel: 'Div',
      finalLabel: 'Champ',
      round1: sortedAfc.sortedWildCards,
      semis: sortedAfc.sortedDivisionals,
      final: updatedAfcFinal,
    },
    right: {
      label: 'NFC',
      round1Label: 'WC',
      semisLabel: 'Div',
      finalLabel: 'Champ',
      round1: sortedNfc.sortedWildCards,
      semis: sortedNfc.sortedDivisionals,
      final: updatedNfcFinal,
    },
    finalsLabel: 'Super Bowl',
    finals: updatedSuperBowl,
  }
}
