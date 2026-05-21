'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LeaderboardRow } from '@/types/api'
import { fmtVal } from '@/lib/format'

interface HeroStripProps {
  row: LeaderboardRow
  sport: string
  accentColor: string
  showTeam?: boolean
  useTeamColor?: boolean
  expandedContent?: React.ReactNode
  isExpanded?: boolean
  onToggle?: () => void
  topOffset?: number
}

const heroStatsBySport: Record<string, {
  primary: string
  label: string
  secondary: Array<{ key: string; label: string }>
}> = {
  f1:     { primary: 'points',        label: 'PTS',      secondary: [{ key: 'wins', label: 'W' }, { key: 'podiums', label: 'POD' }, { key: 'poles', label: 'PP' }] },
  soccer: { primary: 'goals',         label: 'Goals',    secondary: [{ key: 'assists', label: 'A' }, { key: 'appearances', label: 'Apps' }] },
  nfl:    { primary: 'passing_yards', label: 'Pass YDS', secondary: [{ key: 'passing_tds', label: 'TD' }, { key: 'interceptions', label: 'INT' }] },
  nba:    { primary: 'ppg',           label: 'PPG',      secondary: [{ key: 'rpg', label: 'RPG' }, { key: 'apg', label: 'APG' }] },
  cricket:{ primary: 'runs',          label: 'Runs',     secondary: [{ key: 'wickets', label: 'WK' }, { key: 'strike_rate', label: 'SR' }] },
  tennis: { primary: 'wins',          label: 'Wins',     secondary: [{ key: 'matches', label: 'M' }, { key: 'win_pct', label: 'Win%' }] },
  mma:    { primary: 'wins',          label: 'Wins',     secondary: [{ key: 'fights', label: 'F' }, { key: 'losses', label: 'L' }] },
}

export function heroConfigForRow(sport: string, row: LeaderboardRow) {
  if (sport !== 'nfl') return heroStatsBySport[sport]

  const position = String(row.stats.position ?? '').toUpperCase()
  if (position === 'RB') {
    return {
      primary: 'rushing_yards',
      label: 'Rush YDS',
      secondary: [
        { key: 'rushing_tds', label: 'TD' },
        { key: 'receiving_yards', label: 'Rec YDS' },
      ],
    }
  }

  if (position === 'QB') return heroStatsBySport.nfl

  return {
    primary: 'receiving_yards',
    label: 'Rec YDS',
    secondary: [
      { key: 'receptions', label: 'Rec' },
      { key: 'receiving_tds', label: 'TD' },
    ],
  }
}

export function HeroStrip({ row, sport, accentColor, showTeam = true, useTeamColor = true, expandedContent, isExpanded, onToggle, topOffset = 128 }: HeroStripProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const expanded = isExpanded !== undefined ? isExpanded : internalExpanded
  const handleToggle = onToggle || (() => setInternalExpanded(e => !e))

  const config = heroConfigForRow(sport, row)
  if (!config) return null

  const primaryVal = row.stats[config.primary]

  return (
    <div
      className="sticky z-[13] flex-shrink-0 bg-sv-surface"
      style={{
        top: topOffset,
        borderLeft: `4px solid ${useTeamColor ? row.team.colorPrimary : '#e4e3df'}`,
        boxShadow: expanded
          ? '0 8px 22px rgba(17,17,16,0.035)'
          : 'inset 0 -1px 0 #e4e3df, 0 8px 22px rgba(17,17,16,0.035)',
      }}
    >
      {/* Clickable row */}
      <motion.div
        onClick={handleToggle}
        whileHover={{ backgroundColor: '#fbfaf7' }}
        transition={{ duration: 0.15 }}
        className="flex h-[52px] cursor-pointer items-center overflow-hidden px-3 sm:px-6"
        style={{ borderBottom: `2px solid ${expanded ? accentColor : 'transparent'}` }}
      >
        {/* P1 indicator */}
        <div className="flex items-center gap-[6px] mr-3">
          <span
            className="rounded-full border border-sv-divider bg-sv-surface-warm px-2 py-1 text-[10px] tracking-[0.06em]"
            style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
          >
            P1
          </span>
          <div className="w-[6px] h-[6px] rounded-full" style={{ background: accentColor }} />
        </div>

        {/* Name */}
        <span className="mr-1 min-w-0 truncate text-[14px] font-semibold text-sv-text-primary sm:text-[15px]">{row.name}</span>
        {showTeam && (
          <span className="mr-4 hidden whitespace-nowrap pl-1 text-xs text-sv-text-muted sm:inline">{row.team.shortName ?? row.team.name}</span>
        )}

        {/* Divider */}
        {showTeam && <div className="hidden sm:block w-px h-[20px] bg-sv-divider mr-4" />}

        {/* Stats */}
        <div className="flex items-center gap-2 sm:gap-4 ml-2 sm:ml-0 shrink-0">
          <div className="flex items-baseline gap-1">
            <span
            className="text-[15px] font-semibold text-sv-text-primary sm:text-base"
              style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              {fmtVal(primaryVal, config.primary)}
            </span>
            <span
            className="text-[10px] uppercase text-sv-text-muted"
              style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              {config.label}
            </span>
          </div>
          {config.secondary.map(s => (
            <div key={s.key} className="hidden sm:flex items-baseline gap-1">
              <span
                className="text-[13px] font-medium text-sv-text-primary"
                style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                {fmtVal(row.stats[s.key], s.key)}
              </span>
              <span
                className="text-[10px] uppercase text-sv-text-muted"
                style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Expand chevron */}
        <div className="ml-auto flex items-center gap-2">
          <motion.span
            className="text-[11px] text-sv-text-muted"
            style={{ display: 'inline-block' }}
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >▾</motion.span>
        </div>
      </motion.div>

      {/* Animated expanded content */}
      <AnimatePresence initial={false}>
        {expanded && expandedContent && (
          <motion.div
            key="hero-expand"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden', borderBottom: `2px solid ${accentColor}` }}
          >
            {expandedContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
