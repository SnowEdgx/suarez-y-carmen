-- Public course pages can show the published syllabus without exposing
-- private video URLs or storage paths.

create or replace view public.public_lessons
with (security_barrier = true) as
select
  lessons.id,
  lessons.course_id,
  lessons.title,
  lessons.description,
  lessons.position,
  lessons.is_free_preview
from public.lessons
join public.courses on courses.id = lessons.course_id
where lessons.is_published = true
  and courses.is_published = true;

grant select on public.public_lessons to anon, authenticated;

comment on view public.public_lessons is
  'Public lesson metadata projection for course pages. It intentionally excludes video URLs and storage paths.';
