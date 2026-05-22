'use client'

import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { SPORT_CONFIGS } from '@/config/sports'

const DISABLED_SPORTS = new Set(['soccer', 'mma'])

const SPORTS = SPORT_CONFIGS.map(config => {
  const competitions = config.competitions.map(competition => competition.name)
  const isDisabled = DISABLED_SPORTS.has(config.slug)

  return {
    slug: config.slug,
    name: config.name,
    accent: config.accentColor,
    mark: config.icon,
    competitions,
    status: isDisabled ? 'Paused' : 'Live',
    range: config.slug === 'mma' ? '2024' : '2018-2024',
    primaryMetric: config.rankingLabel,
    isDisabled,
  }
})

const liveCount = SPORTS.filter(sport => !sport.isDisabled).length
const competitionCount = SPORTS.reduce((sum, sport) => sum + (sport.isDisabled ? 0 : sport.competitions.length), 0)

export default function HomePage() {
  const router = useRouter()
  const shouldReduce = useReducedMotion()

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12">
      <motion.section
        initial={shouldReduce ? false : { opacity: 0, y: 14 }}
        animate={shouldReduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-center gap-8"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(520px,1.08fr)] lg:items-end">
          <div className="flex flex-col gap-7">
            <div className="flex flex-wrap items-center gap-2">
              <span className="sv-data-chip sv-meta-label">
                SportVault Archive
              </span>
              <span className="sv-data-chip sv-meta-label">
                {liveCount} live sports
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-[760px] text-[42px] font-semibold leading-[1.02] tracking-normal text-sv-text-primary sm:text-[58px] lg:text-[66px]">
                Sports history, sorted like a front office would use it.
              </h1>
              <p className="max-w-[560px] text-[15px] leading-7 text-sv-text-secondary sm:text-base">
                Compare seasons, scan leaderboards, open playoff brackets, and drill into the players who shaped each campaign.
              </p>
            </div>

            <div className="grid max-w-[620px] grid-cols-3 border-y border-sv-divider">
              <StatTile value="2018" label="archive start" />
              <StatTile value={`${competitionCount}`} label="competitions" />
              <StatTile value="1-game" label="match focus" />
            </div>
          </div>

          <div className="sv-editorial-surface rounded-[8px] p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-sv-divider pb-3">
              <div>
                <div className="sv-meta-label">Select a sport</div>
                <div className="mt-1 text-sm font-medium text-sv-text-primary">Leaderboards, brackets, profiles</div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {SPORTS.map((sport, index) => (
                <motion.button
                  key={sport.slug}
                  type="button"
                  disabled={sport.isDisabled}
                  onClick={() => router.push(`/${sport.slug}`)}
                  initial={shouldReduce ? false : { opacity: 0, y: 10 }}
                  animate={shouldReduce ? undefined : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.035, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={sport.isDisabled || shouldReduce ? undefined : { y: -2 }}
                  whileTap={sport.isDisabled || shouldReduce ? undefined : { scale: 0.99 }}
                  className={`sv-subtle-shine group rounded-[7px] border bg-white p-4 text-left transition-colors ${sport.isDisabled ? 'opacity-50' : 'hover:border-sv-border-strong'}`}
                  style={{ borderColor: '#e4e3df' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <SportLogo mark={sport.mark} accent={sport.accent} />
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-semibold text-sv-text-primary">{sport.name}</div>
                        <div className="mt-1 truncate text-[12px] text-sv-text-muted">
                          {sport.competitions[0] ?? 'Season archive'}
                        </div>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 text-[9px] uppercase tracking-[0.08em] text-sv-text-muted" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: sport.isDisabled ? '#b9b6af' : sport.accent }}
                        aria-hidden
                      />
                      <span>{sport.status}</span>
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-sv-divider pt-3">
                    <SmallMetric label="Range" value={sport.range} />
                    <SmallMetric label="Default" value={sport.primaryMetric} />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  )
}

function SportLogo({ mark, accent }: { mark: string; accent: string }) {
  return (
    <span
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-white text-[10px] font-bold tracking-[0.04em] text-sv-text-primary shadow-[inset_0_0_0_4px_rgba(255,255,255,0.75)]"
      style={{
        borderColor: `${accent}66`,
        fontFamily: 'var(--font-dm-mono), monospace',
      }}
      aria-hidden
    >
      <span className="absolute inset-[4px] rounded-full opacity-[0.13]" style={{ backgroundColor: accent }} />
      <span className="absolute bottom-[6px] h-[2px] w-4 rounded-full opacity-80" style={{ backgroundColor: accent }} />
      <span className="relative z-10">{mark}</span>
    </span>
  )
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="py-4 pr-4">
      <div className="text-[20px] font-semibold tabular-nums text-sv-text-primary" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.08em] text-sv-text-muted" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
        {label}
      </div>
    </div>
  )
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-[0.08em] text-sv-text-muted" style={{ fontFamily: 'var(--font-dm-mono), monospace' }}>
        {label}
      </div>
      <div className="mt-1 truncate text-[12px] font-medium text-sv-text-secondary">
        {value}
      </div>
    </div>
  )
}
