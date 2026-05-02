-- Harden user progress writes:
-- Users can only store progress for lessons they can access.

drop policy if exists "Users can insert own progress" on public.user_progress;
drop policy if exists "Users can update own progress" on public.user_progress;

create policy "Users can insert own accessible progress" on public.user_progress
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.lessons l
      join public.courses c on c.id = l.course_id
      where l.id = user_progress.lesson_id
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
