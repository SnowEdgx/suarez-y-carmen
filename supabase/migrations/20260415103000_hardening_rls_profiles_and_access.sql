-- Hardening migration:
-- 1) Fix profiles schema/trigger consistency across previous migrations.
-- 2) Enforce RLS where access should not rely on frontend-only checks.

-- ---------- Profiles schema consistency ----------
alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

do $$
begin
  begin
    alter table public.profiles alter column email drop not null;
  exception
    when undefined_column then
      null;
  end;
end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url',
    timezone('utc'::text, now())
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Profiles policies ----------
alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can view own profile." on public.profiles;
create policy "Users can view own profile." on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- ---------- Courses / lessons / events ----------
alter table public.courses enable row level security;
drop policy if exists "Published courses are viewable by everyone" on public.courses;
create policy "Published courses are viewable by everyone" on public.courses
  for select using (is_published = true);

alter table public.lessons enable row level security;
drop policy if exists "Preview lessons or paid users can view" on public.lessons;
create policy "Preview lessons or paid users can view" on public.lessons
  for select using (
    (
      is_free_preview = true
      and exists (
        select 1
        from public.courses c
        where c.id = lessons.course_id
          and c.is_published = true
      )
    )
    or exists (
      select 1
      from public.user_courses uc
      where uc.course_id = lessons.course_id
        and uc.user_id = auth.uid()
        and uc.status = 'paid'
    )
  );

alter table public.events enable row level security;
drop policy if exists "Active events are viewable by everyone" on public.events;
create policy "Active events are viewable by everyone" on public.events
  for select using (is_active = true);

-- ---------- User progress ----------
alter table public.user_progress enable row level security;

drop policy if exists "Users can view own progress" on public.user_progress;
create policy "Users can view own progress" on public.user_progress
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own progress" on public.user_progress;
create policy "Users can insert own progress" on public.user_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own progress" on public.user_progress;
create policy "Users can update own progress" on public.user_progress
  for update using (auth.uid() = user_id);

-- ---------- Subscriptions (future model hardening) ----------
alter table public.subscriptions enable row level security;
drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions" on public.subscriptions
  for select using (auth.uid() = user_id);

-- ---------- Performance indexes ----------
create index if not exists idx_lessons_course_position
  on public.lessons(course_id, position);

create index if not exists idx_user_courses_user_course_status
  on public.user_courses(user_id, course_id, status);

create index if not exists idx_user_courses_payment_intent
  on public.user_courses(stripe_payment_intent_id);
