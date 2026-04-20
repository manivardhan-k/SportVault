'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SPORT_CONFIGS } from '@/config/sports'

export function SportTabs() {
  const pathname = usePathname()
  const activeSport = pathname.split('/')[1]

  return (
    <nav className="flex gap-1 border-b border-zinc-800 px-4">
      {SPORT_CONFIGS.map(sport => (
        <Link
          key={sport.slug}
          href={`/${sport.slug}`}
          className={`px-4 py-3 text-sm font-medium transition-colors ${
            activeSport === sport.slug
              ? 'border-b-2 border-white text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {sport.icon} {sport.name}
        </Link>
      ))}
    </nav>
  )
}
