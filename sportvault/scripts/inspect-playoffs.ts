import { getNflBracket } from '../lib/queries/nfl-bracket'

async function main() {
  console.log('=== TESTING getNflBracket(2024) ===')
  const bracket = await getNflBracket(2024)
  
  console.log('\n--- AFC ---')
  console.log('Round 1 (Wild Card):')
  bracket.left.round1.forEach(m => {
    console.log(`  [${m.id}] Order ${m.seriesOrder} | ${m.team1.shortName} (${m.team1.wins}) vs ${m.team2.shortName} (${m.team2.wins}) | Winner: ${m.winnerTeamId === m.team1.id ? m.team1.shortName : m.winnerTeamId === m.team2.id ? m.team2.shortName : 'none'}`)
  })
  
  console.log('Round 2 (Divisional):')
  bracket.left.semis.forEach(m => {
    console.log(`  [${m.id}] Order ${m.seriesOrder} | ${m.team1.shortName} (${m.team1.wins}) vs ${m.team2.shortName} (${m.team2.wins}) | Winner: ${m.winnerTeamId === m.team1.id ? m.team1.shortName : m.winnerTeamId === m.team2.id ? m.team2.shortName : 'none'}`)
  })
  
  console.log('\n--- NFC ---')
  console.log('Round 1 (Wild Card):')
  bracket.right.round1.forEach(m => {
    console.log(`  [${m.id}] Order ${m.seriesOrder} | ${m.team1.shortName} (${m.team1.wins}) vs ${m.team2.shortName} (${m.team2.wins}) | Winner: ${m.winnerTeamId === m.team1.id ? m.team1.shortName : m.winnerTeamId === m.team2.id ? m.team2.shortName : 'none'}`)
  })
  
  console.log('Round 2 (Divisional):')
  bracket.right.semis.forEach(m => {
    console.log(`  [${m.id}] Order ${m.seriesOrder} | ${m.team1.shortName} (${m.team1.wins}) vs ${m.team2.shortName} (${m.team2.wins}) | Winner: ${m.winnerTeamId === m.team1.id ? m.team1.shortName : m.winnerTeamId === m.team2.id ? m.team2.shortName : 'none'}`)
  })
}

main()
  .catch(console.error)
