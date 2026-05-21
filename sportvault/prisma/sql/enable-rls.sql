-- Enable Row Level Security on all public tables.
-- App uses Prisma via the postgres role (DIRECT_URL/DATABASE_URL) which BYPASSES RLS,
-- so this has zero functional impact. It blocks the public Supabase Data API
-- (anon role / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) from reading these tables.
-- No policies are added: anon role gets nothing.

ALTER TABLE public.seasons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.f1_driver_standings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soccer_player_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.f1_race_results      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nba_player_stats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_seasons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfl_player_stats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_standings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nba_playoff_series   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfl_playoff_games    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._prisma_migrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfl_weekly_stats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cricket_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cricket_match_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tennis_player_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mma_fighter_stats    ENABLE ROW LEVEL SECURITY;


-- Verify:
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relnamespace = 'public'::regnamespace AND relkind = 'r';
