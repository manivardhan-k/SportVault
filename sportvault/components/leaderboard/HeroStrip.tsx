'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LeaderboardRow } from '@/types/api'

interface HeroStripProps {
  row: LeaderboardRow
  sport: string
  accentColor: string
  expandedContent?: React.ReactNode
  isExpanded?: boolean
  onToggle?: () => void
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
}

export function HeroStrip({ row, sport, accentColor, expandedContent, isExpanded, onToggle }: HeroStripProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const expanded = isExpanded !== undefined ? isExpanded : internalExpanded
  const handleToggle = onToggle || (() => setInternalExpanded(e => !e))

  const config = heroStatsBySport[sport]
  if (!config) return null

  const primaryVal = row.stats[config.primary]

  return (
    <div
      className="bg-sv-surface sticky top-[40px] z-[8] flex-shrink-0"
      style={{
        borderBottom: expanded ? 'none' : `2px solid ${accentColor}`,
        borderLeft: `5px solid ${row.team.colorPrimary}`,
      }}
    >
      {/* Clickable row */}
      <motion.div
        onClick={handleToggle}
        whileHover={{ backgroundColor: '#faf9f7' }}
        transition={{ duration: 0.15 }}
        className="flex items-center h-[52px] px-6 cursor-pointer"
        style={{ borderBottom: `2px solid ${expanded ? accentColor : 'transparent'}` }}
      >
        {/* P1 indicator */}
        <div className="flex items-center gap-[6px] mr-3">
          <span
            className="text-[10px] tracking-[0.06em]"
            style={{ fontFamily: 'var(--font-dm-mono), monospace', color: '#9a9894' }}
          >
            P1
          </span>
          <div className="w-[6px] h-[6px] rounded-full" style={{ background: accentColor }} />
        </div>

        {/* Name */}
        <span className="text-[15px] font-semibold text-sv-text-primary mr-1">{row.name}</span>
        <span className="text-xs text-sv-text-muted mr-4 pl-1">{row.team.shortName ?? row.team.name}</span>

        {/* Divider */}
        <div className="w-px h-[20px] bg-sv-divider mr-4" />

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span
              className="text-base font-semibold text-sv-text-primary"
              style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              {primaryVal ?? '—'}
            </span>
            <span
              className="text-[10px] text-sv-text-muted"
              style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
            >
              {config.label}
            </span>
          </div>
          {config.secondary.map(s => (
            <div key={s.key} className="flex items-baseline gap-1">
              <span
                className="text-[13px] font-medium text-sv-text-primary"
                style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                {row.stats[s.key] ?? '—'}
              </span>
              <span
                className="text-[10px] text-sv-text-muted"
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
