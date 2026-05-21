import type { LeaderboardRow } from '@/types/api'

export function filterRowsByPlayerName(rows: LeaderboardRow[], search: string): LeaderboardRow[] {
  const needle = search.trim().toLowerCase()
  if (!needle) return rows

  const searchTokens = needle.replace(/\./g, '').split(/\s+/)

  return rows.filter(row => {
    const rowName = row.name.toLowerCase()
    
    if (rowName.includes(needle)) return true
    
    const rowTokens = rowName.replace(/\./g, '').split(/\s+/)

    return searchTokens.every(searchToken => {
      return rowTokens.some(rowToken => {
        if (rowToken.includes(searchToken)) return true
        
        // Match if the row token is an initial (e.g. 't') and the search token (e.g. 'tom') starts with it.
        // This solves sports like NFL and Cricket having short names ('T. Brady', 'V Kohli').
        if (rowToken.length === 1 && searchToken.startsWith(rowToken)) return true

        return false
      })
    })
  })
}
