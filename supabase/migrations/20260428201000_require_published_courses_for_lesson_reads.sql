-- Keep lesson reads blocked when the parent course is unpublished,
-- even for users who previously purchased the course.

drop policy if exists "Preview lessons or paid users can view" on public.lessons;
create policy "Preview lessons or paid users can view" on public.lessons
  for select using (
    is_published = true
    and exists (
      select 1
      from public.courses c
      where c.id = lessons.course_id
        and c.is_published = true
        and (
          lessons.is_free_preview = true
          or exists (
            select 1
            from public.user_courses uc
            where uc.course_id = lessons.course_id
              and uc.user_id = auth.uid()
              and uc.status = 'paid'
          )
        )
    )
  );
