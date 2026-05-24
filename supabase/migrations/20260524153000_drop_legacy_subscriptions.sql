-- The current access model uses one-time course purchases through user_courses.
-- The legacy subscriptions table belonged to an earlier design and is not used by the application.
drop table if exists public.subscriptions cascade;
