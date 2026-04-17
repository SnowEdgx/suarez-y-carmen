-- Secure lesson video delivery:
-- 1) Store private object reference separately from legacy video_url.
-- 2) Ensure private bucket exists for paid lesson content.

alter table public.lessons
  add column if not exists video_storage_path text;

alter table public.lessons
  drop constraint if exists lessons_video_storage_path_not_blank;

alter table public.lessons
  add constraint lessons_video_storage_path_not_blank
  check (
    video_storage_path is null
    or length(trim(video_storage_path)) > 0
  );

insert into storage.buckets (id, name, public)
values ('course-videos', 'course-videos', false)
on conflict (id) do update
set public = excluded.public;
