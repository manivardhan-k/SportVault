'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { BracketMatch as BracketMatchType } from '@/types/api'

interface BracketMatchProps {
  match: BracketMatchType
  isSelected: boolean
  accentColor: string
  onSelect: (match: BracketMatchType) => void
}

export function BracketMatch({ match, isSelected, accentColor, onSelect }: BracketMatchProps) {
  const { team1, team2 } = match
  const shouldReduce = useReducedMotion()

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(match)}
      whileHover={shouldReduce ? undefined : { y: -2 }}
      whileTap={shouldReduce ? undefined : { scale: 0.99 }}
      className="sv-subtle-shine relative z-10 block w-full rounded-[7px] border bg-white text-left transition-colors hover:z-50"
      style={{
        borderColor: isSelected ? accentColor : '#e4e3df',
        boxShadow: isSelected ? `0 0 0 1px ${accentColor}, 0 14px 30px ${accentColor}18` : '0 1px 0 rgba(17,17,16,0.03)',
        padding: 0,
      }}
    >
      <TeamRow team={team1} dimmed={!team1.isWinner && match.isComplete} />
      <div style={{ height: 1, background: '#e4e3df' }} />
      <TeamRow team={team2} dimmed={!team2.isWinner && match.isComplete} />
    </motion.button>
  )
}

function TeamRow({ team, dimmed }: { team: BracketMatchType['team1']; dimmed: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-2.5 py-2 text-[11px]"
      style={{
        opacity: dimmed ? 0.45 : 1,
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="inline-block h-4 w-1.5 flex-shrink-0 rounded-sm"
          style={{ background: team.colorPrimary }}
        />
        <span className="font-medium truncate">{team.shortName}</span>
      </div>
      <span
        className="text-[11px] tabular-nums"
        style={{
          fontFamily: 'var(--font-dm-mono), monospace',
          fontWeight: team.isWinner ? 600 : 400,
          color: team.isWinner ? '#1a1a1a' : '#9a9894',
        }}
      >
        {team.wins}
      </span>
    </div>
  )
}
