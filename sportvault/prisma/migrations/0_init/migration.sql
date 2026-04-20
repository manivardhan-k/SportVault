◇ injected env (6) from .env.local // tip: ⌘ suppress logs { quiet: true }
◇ injected env (0) from .env // tip: ◈ encrypted .env [www.dotenvx.com]
Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "sports" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" SERIAL NOT NULL,
    "sportId" INTEGER NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "competitionType" VARCHAR(30) NOT NULL,
    "seasonPattern" VARCHAR(20),

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "label" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" SERIAL NOT NULL,
    "sportId" INTEGER NOT NULL,
    "externalId" VARCHAR(100),
    "name" VARCHAR(100) NOT NULL,
    "shortName" VARCHAR(30),
    "colorPrimary" VARCHAR(7),
    "colorSecondary" VARCHAR(7),
    "logoUrl" VARCHAR(255),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" SERIAL NOT NULL,
    "sportId" INTEGER NOT NULL,
    "externalId" VARCHAR(100),
    "firstName" VARCHAR(100),
    "lastName" VARCHAR(100) NOT NULL,
    "nationality" VARCHAR(60),
    "dateOfBirth" DATE,
    "position" VARCHAR(30),
    "number" INTEGER,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_seasons" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,

    CONSTRAINT "player_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "f1_driver_standings" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "finalPosition" INTEGER,
    "totalPoints" DECIMAL(6,2),
    "wins" INTEGER NOT NULL DEFAULT 0,
    "podiums" INTEGER NOT NULL DEFAULT 0,
    "poles" INTEGER NOT NULL DEFAULT 0,
    "fastestLaps" INTEGER NOT NULL DEFAULT 0,
    "dnfs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "f1_driver_standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "f1_race_results" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "raceName" VARCHAR(100),
    "finishPosition" INTEGER,
    "gridPosition" INTEGER,
    "points" DECIMAL(5,2),
    "status" VARCHAR(50),
    "fastestLap" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "f1_race_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "soccer_player_stats" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "appearances" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "yellowCards" INTEGER NOT NULL DEFAULT 0,
    "redCards" INTEGER NOT NULL DEFAULT 0,
    "minutesPlayed" INTEGER NOT NULL DEFAULT 0,
    "goalsPer90" DECIMAL(4,2),
    "assistsPer90" DECIMAL(4,2),

    CONSTRAINT "soccer_player_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nfl_player_stats" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "seasonType" VARCHAR(20) NOT NULL DEFAULT 'regular',
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "stats" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "nfl_player_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nba_player_stats" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "pointsPerGame" DECIMAL(5,2),
    "reboundsPerGame" DECIMAL(5,2),
    "assistsPerGame" DECIMAL(5,2),
    "stealsPerGame" DECIMAL(5,2),
    "blocksPerGame" DECIMAL(5,2),
    "fgPct" DECIMAL(5,3),
    "threePtPct" DECIMAL(5,3),
    "ftPct" DECIMAL(5,3),
    "minutesPerGame" DECIMAL(5,2),

    CONSTRAINT "nba_player_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_standings" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "seasonId" INTEGER NOT NULL,
    "position" INTEGER,
    "played" INTEGER,
    "won" INTEGER,
    "drawn" INTEGER,
    "lost" INTEGER,
    "points" INTEGER,
    "extra" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "team_standings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sports_slug_key" ON "sports"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "competitions_slug_key" ON "competitions"("slug");

-- CreateIndex
CREATE INDEX "seasons_competitionId_year_idx" ON "seasons"("competitionId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_competitionId_year_key" ON "seasons"("competitionId", "year");

-- CreateIndex
CREATE INDEX "player_seasons_seasonId_idx" ON "player_seasons"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "player_seasons_playerId_seasonId_key" ON "player_seasons"("playerId", "seasonId");

-- CreateIndex
CREATE INDEX "f1_driver_standings_seasonId_idx" ON "f1_driver_standings"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "f1_driver_standings_playerId_seasonId_key" ON "f1_driver_standings"("playerId", "seasonId");

-- CreateIndex
CREATE INDEX "f1_race_results_playerId_seasonId_idx" ON "f1_race_results"("playerId", "seasonId");

-- CreateIndex
CREATE INDEX "soccer_player_stats_seasonId_idx" ON "soccer_player_stats"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "soccer_player_stats_playerId_seasonId_key" ON "soccer_player_stats"("playerId", "seasonId");

-- CreateIndex
CREATE INDEX "nfl_player_stats_seasonId_seasonType_idx" ON "nfl_player_stats"("seasonId", "seasonType");

-- CreateIndex
CREATE UNIQUE INDEX "nfl_player_stats_playerId_seasonId_seasonType_key" ON "nfl_player_stats"("playerId", "seasonId", "seasonType");

-- CreateIndex
CREATE INDEX "nba_player_stats_seasonId_idx" ON "nba_player_stats"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "nba_player_stats_playerId_seasonId_key" ON "nba_player_stats"("playerId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "team_standings_teamId_seasonId_key" ON "team_standings"("teamId", "seasonId");

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_seasons_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_seasons_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_seasons" ADD CONSTRAINT "player_seasons_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "f1_driver_standings" ADD CONSTRAINT "f1_driver_standings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "f1_driver_standings" ADD CONSTRAINT "f1_driver_standings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "f1_race_results" ADD CONSTRAINT "f1_race_results_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "f1_race_results" ADD CONSTRAINT "f1_race_results_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soccer_player_stats" ADD CONSTRAINT "soccer_player_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "soccer_player_stats" ADD CONSTRAINT "soccer_player_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfl_player_stats" ADD CONSTRAINT "nfl_player_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nfl_player_stats" ADD CONSTRAINT "nfl_player_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nba_player_stats" ADD CONSTRAINT "nba_player_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nba_player_stats" ADD CONSTRAINT "nba_player_stats_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_standings" ADD CONSTRAINT "team_standings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_standings" ADD CONSTRAINT "team_standings_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

