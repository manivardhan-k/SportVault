import { redirect } from 'next/navigation'
import { getSportConfig } from '@/config/sports'
import { prisma } from '@/lib/db'

export default async function SportPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params
  const config = getSportConfig(sport)
  if (!config) redirect('/f1')

  // Find first competition with seasons
  let targetComp = null
  let targetSeason = null

  for (const comp of config.competitions) {
    const season = await prisma.season.findFirst({
      where: { competition: { slug: comp.slug } },
      orderBy: { year: 'desc' },
    })
    if (season) {
      targetComp = comp
      targetSeason = season
      break
    }
  }

  if (!targetComp || !targetSeason) redirect('/f1')
  redirect(`/${sport}/${targetComp.slug}/${targetSeason.year}`)
}
