'use client'

import { motion, useReducedMotion } from 'framer-motion'

interface ViewToggleProps {
  view: 'table' | 'bracket'
  onChange: (v: 'table' | 'bracket') => void
  accentColor: string
}

export function ViewToggle({ view, onChange, accentColor }: ViewToggleProps) {
  const shouldReduce = useReducedMotion()
  const options = [
    { key: 'table' as const, label: 'Table', icon: '≡' },
    { key: 'bracket' as const, label: 'Bracket', icon: '⌁' },
  ]

  return (
    <div
      className="inline-flex rounded-full border bg-white p-1 shadow-[0_1px_0_rgba(17,17,16,0.03)]"
      style={{ borderColor: '#e4e3df' }}
    >
      {options.map(option => {
        const active = option.key === view
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className="relative inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[10px] uppercase tracking-[0.08em] transition-colors"
            style={{
              fontFamily: 'var(--font-dm-mono), monospace',
              color: active ? '#111110' : '#7a7771',
              fontWeight: active ? 600 : 500,
            }}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId="leaderboard-view-toggle"
                className="absolute inset-0 rounded-full"
                style={{ background: '#f2f1ee', boxShadow: `inset 0 0 0 1px ${accentColor}55` }}
                transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative text-[13px] leading-none" aria-hidden>{option.icon}</span>
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
