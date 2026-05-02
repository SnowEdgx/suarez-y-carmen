-- CMS editorial sync metadata.
-- Strapi is an editorial source only; Supabase remains the operational source
-- for purchases, lesson access, progress and protected video delivery.

alter table public.courses
  add column if not exists cms_document_id text,
  add column if not exists cms_entry_id text,
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

alter table public.lessons
  add column if not exists cms_document_id text,
  add column if not exists cms_entry_id text,
  add column if not exists is_published boolean not null default true,
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

alter table public.events
  add column if not exists cms_document_id text,
  add column if not exists cms_entry_id text,
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

create unique index if not exists courses_cms_document_id_unique
  on public.courses(cms_document_id)
  where cms_document_id is not null;

create unique index if not exists lessons_cms_document_id_unique
  on public.lessons(cms_document_id)
  where cms_document_id is not null;

create unique index if not exists events_cms_document_id_unique
  on public.events(cms_document_id)
  where cms_document_id is not null;

create index if not exists idx_lessons_course_published_position
  on public.lessons(course_id, is_published, position);

-- Published lesson visibility must account for the new lesson-level flag.
drop policy if exists "Preview lessons or paid users can view" on public.lessons;
create policy "Preview lessons or paid users can view" on public.lessons
  for select using (
    is_published = true
    and (
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
    )
  );

drop policy if exists "Users can insert own accessible progress" on public.user_progress;
create policy "Users can insert own accessible progress" on public.user_progress
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = user_progress.lesson_id
        and l.is_published = true
        and c.is_published = true
        and (
          l.is_free_preview = true
          or exists (
            select 1
            from public.user_courses uc
            where uc.course_id = l.course_id
              and uc.user_id = auth.uid()
              and uc.status = 'paid'
          )
        )
    )
  );

drop policy if exists "Users can update own accessible progress" on public.user_progress;
create policy "Users can update own accessible progress" on public.user_progress
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = user_progress.lesson_id
        and l.is_published = true
        and c.is_published = true
        and (
          l.is_free_preview = true
          or exists (
            select 1
            from public.user_courses uc
            where uc.course_id = l.course_id
              and uc.user_id = auth.uid()
              and uc.status = 'paid'
          )
        )
    )
  );
