import { redirect } from 'next/navigation'
import { getSportConfig } from '@/config/sports'
import { prisma } from '@/lib/db'

export default async function SportPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params
  const config = getSportConfig(sport)
  if (!config) redirect('/f1')

  const defaultComp = config.competitions[0]

  const latestSeason = await prisma.season.findFirst({
    where: { competition: { slug: defaultComp.slug }, status: 'completed' },
    orderBy: { year: 'desc' },
  })

  redirect(`/${sport}/${defaultComp.slug}/${latestSeason?.year ?? 2023}`)
}
