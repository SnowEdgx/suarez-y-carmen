-- Editorial ordering for courses managed from Strapi.

alter table public.courses
  add column if not exists position integer default 0 not null;

create index if not exists idx_courses_public_position
  on public.courses(is_published, position, created_at);

grant select (position) on public.courses to anon, authenticated;
