'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SportConfig } from '@/types/sport-config'

interface CompetitionSelectorProps {
  sportConfig: SportConfig
  defaultYear: number
  seededSlugs?: string[]
}

function CompetitionTab({
  slug, name, href, active, disabled,
}: { slug: string; name: string; href: string; active: boolean; disabled: boolean }) {
  if (disabled) {
    return (
      <span
        className="rounded-full px-3 py-1 text-sm cursor-not-allowed bg-zinc-900 text-zinc-600"
        title="No data available"
      >
        {name}
      </span>
    )
  }
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm transition-colors ${
        active ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
      }`}
    >
      {name}
    </Link>
  )
}

export function CompetitionSelector({ sportConfig, defaultYear, seededSlugs }: CompetitionSelectorProps) {
  const pathname = usePathname()
  const activeCompetition = pathname.split('/')[2]

  const groups = sportConfig.competitions.reduce<Record<string, typeof sportConfig.competitions>>(
    (acc, comp) => {
      const key = comp.group ?? '__none__'
      acc[key] = [...(acc[key] ?? []), comp]
      return acc
    },
    {}
  )

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 px-4 py-3">
      {Object.entries(groups).map(([groupKey, comps]) => {
        if (groupKey === '__none__') {
          return comps.map(comp => (
            <CompetitionTab
              key={comp.slug}
              slug={comp.slug}
              name={comp.name}
              href={`/${sportConfig.slug}/${comp.slug}/${defaultYear}`}
              active={activeCompetition === comp.slug}
              disabled={!!seededSlugs && !seededSlugs.includes(comp.slug)}
            />
          ))
        }
        return (
          <div key={groupKey} className="flex items-center gap-1">
            <span className="mr-1 text-xs text-zinc-500">{groupKey}</span>
            {comps.map(comp => (
              <CompetitionTab
                key={comp.slug}
                slug={comp.slug}
                name={comp.name}
                href={`/${sportConfig.slug}/${comp.slug}/${defaultYear}`}
                active={activeCompetition === comp.slug}
                disabled={!!seededSlugs && !seededSlugs.includes(comp.slug)}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
