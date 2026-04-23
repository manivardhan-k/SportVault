'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LampContainer } from '@/components/ui/lamp'
import { GooeyText } from '@/components/ui/gooey-text'

const SPORTS = [
  { slug: 'f1',     name: 'Formula 1', accent: '#E10600' },
  { slug: 'soccer', name: 'Soccer',    accent: '#00B04F' },
  { slug: 'nfl',    name: 'NFL',       accent: '#013369' },
  { slug: 'nba',    name: 'NBA',       accent: '#C9082A' },
]

const SPORT_WORDS = ['Formula 1', 'Soccer', 'NFL', 'NBA']

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[calc(100vh-52px)]">
      <LampContainer accentColor="#d97706">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mb-6 flex items-center gap-2 rounded-full px-4 py-1.5 border border-sv-divider bg-sv-surface"
        >
          <span
            className="text-[10px] tracking-[0.14em] text-sv-text-muted"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            HISTORICAL SPORTS DATA
          </span>
        </motion.div>

        {/* Hero heading with GooeyText morph */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-col items-center gap-1 mb-4"
        >
          <h1 className="text-[52px] font-bold leading-[1.05] tracking-tight text-sv-text-primary text-center">
            Every stat.
          </h1>
          <div className="flex items-baseline gap-3">
            <span className="text-[52px] font-bold leading-[1.05] tracking-tight text-sv-text-primary">
              Every
            </span>
            <GooeyText
              words={SPORT_WORDS}
              interval={2600}
              textClassName="text-[52px] leading-[1.05] tracking-tight text-sv-amber"
            />
            <span className="text-[52px] font-bold leading-[1.05] tracking-tight text-sv-text-primary">
              season.
            </span>
          </div>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="text-[15px] text-sv-text-secondary text-center max-w-[400px] mb-10 leading-relaxed"
        >
          Deep-dive leaderboards, season charts, and player profiles for F1, Soccer, NFL, and NBA.
        </motion.p>

        {/* Sport cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.5 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {SPORTS.map((sport, i) => (
            <motion.button
              key={sport.slug}
              onClick={() => router.push(`/${sport.slug}`)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.15 + i * 0.07, duration: 0.4 }}
              whileHover={{ y: -3, boxShadow: `0 8px 28px ${sport.accent}28` }}
              whileTap={{ scale: 0.97 }}
              className="flex flex-col items-center gap-3 rounded-2xl px-8 py-6 bg-sv-surface border border-sv-divider cursor-pointer"
              style={{ borderTop: `3px solid ${sport.accent}` }}
            >
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{ background: sport.accent }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 2.2 + i * 0.3, ease: 'easeInOut' }}
              />
              <span
                className="text-[12px] font-semibold tracking-[0.1em]"
                style={{ color: sport.accent, fontFamily: 'var(--font-dm-mono), monospace' }}
              >
                {sport.name.toUpperCase()}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.5 }}
          className="mt-14 flex flex-col items-center gap-1"
        >
          <span
            className="text-[10px] tracking-[0.12em] text-sv-text-muted"
            style={{ fontFamily: 'var(--font-dm-mono), monospace' }}
          >
            SELECT A SPORT TO EXPLORE
          </span>
          <motion.span
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
            className="text-sv-text-muted text-xs mt-0.5"
          >
            ▾
          </motion.span>
        </motion.div>
      </LampContainer>
    </div>
  )
}
