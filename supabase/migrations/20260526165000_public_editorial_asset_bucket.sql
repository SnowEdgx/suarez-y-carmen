-- Public editorial media used by courses, events and in-person classes.
-- Premium lesson videos and course resources remain in private buckets.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-assets',
  'public-assets',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public editorial assets are readable" on storage.objects;
create policy "Public editorial assets are readable" on storage.objects
  for select
  using (bucket_id = 'public-assets');
