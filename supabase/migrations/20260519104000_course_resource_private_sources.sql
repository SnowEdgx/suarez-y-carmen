-- Paid downloadable resources must reference private Supabase Storage objects.

alter table public.course_resources
  add constraint course_resources_paid_private_source
  check (
    is_free_preview = true
    or resource_storage_path is not null
  );
