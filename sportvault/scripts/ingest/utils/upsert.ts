import { prisma } from './db'

export async function upsertSport(slug: string, name: string, icon: string) {
  return prisma.sport.upsert({
    where: { slug },
    create: { slug, name, icon },
    update: { name, icon },
  })
}

export async function upsertCompetition(sportId: number, slug: string, name: string, type: string) {
  return prisma.competition.upsert({
    where: { slug },
    create: { sportId, slug, name, competitionType: type },
    update: { name },
  })
}

export async function upsertSeason(competitionId: number, year: number, label: string) {
  return prisma.season.upsert({
    where: { competitionId_year: { competitionId, year } },
    create: { competitionId, year, label, status: 'completed' },
    update: { label },
  })
}

export async function upsertTeam(
  sportId: number,
  externalId: string,
  name: string,
  shortName: string,
  color: string
) {
  return prisma.team.upsert({
    where: { sportId_externalId: { sportId, externalId } },
    create: { sportId, externalId, name, shortName, colorPrimary: color },
    update: { name, shortName, colorPrimary: color },
  })
}

export async function upsertPlayer(
  sportId: number,
  externalId: string,
  firstName: string,
  lastName: string,
  nationality: string
) {
  return prisma.player.upsert({
    where: { sportId_externalId: { sportId, externalId } },
    create: { sportId, externalId, firstName, lastName, nationality },
    update: { firstName, lastName, nationality },
  })
}
