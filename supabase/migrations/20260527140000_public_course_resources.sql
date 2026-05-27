-- Public course resources projection to list metadata without private storage references
create or replace view public.public_course_resources
with (security_barrier = true) as
select
  course_resources.id,
  course_resources.course_id,
  course_resources.title,
  course_resources.description,
  course_resources.file_name,
  course_resources.mime_type,
  course_resources.position,
  course_resources.is_free_preview,
  course_resources.created_at
from public.course_resources
join public.courses on courses.id = course_resources.course_id
where course_resources.is_published = true
  and courses.is_published = true;

grant select on public.public_course_resources to anon, authenticated;

comment on view public.public_course_resources is
  'Public course resource metadata projection for course pages. It intentionally excludes private storage paths and URLs.';
