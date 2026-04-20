import { f1Config } from './f1.config'
import { soccerConfig } from './soccer.config'
import { nflConfig } from './nfl.config'
import { nbaConfig } from './nba.config'
import type { SportConfig } from '@/types/sport-config'

export const SPORT_CONFIGS: SportConfig[] = [f1Config, soccerConfig, nflConfig, nbaConfig]

export function getSportConfig(slug: string): SportConfig | undefined {
  return SPORT_CONFIGS.find(c => c.slug === slug)
}
