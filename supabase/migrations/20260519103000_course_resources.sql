-- Course resources managed from Strapi and protected through the backend.

create table if not exists public.course_resources (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  description text,
  resource_url text,
  resource_storage_path text,
  file_name text,
  mime_type text,
  position integer default 0 not null,
  is_free_preview boolean default false not null,
  is_published boolean default true not null,
  cms_document_id text unique,
  cms_entry_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint course_resources_title_not_blank check (length(trim(title)) > 0),
  constraint course_resources_source_required check (
    resource_url is not null
    or resource_storage_path is not null
  )
);

create index if not exists idx_course_resources_course_public_order
  on public.course_resources(course_id, is_published, position, created_at);

insert into storage.buckets (id, name, public)
values ('course-resources', 'course-resources', false)
on conflict (id) do update
set public = excluded.public;

alter table public.course_resources enable row level security;

drop policy if exists "Accessible course resources are viewable" on public.course_resources;
create policy "Accessible course resources are viewable" on public.course_resources
  for select using (
    is_published = true
    and exists (
      select 1
      from public.courses c
      where c.id = course_resources.course_id
        and c.is_published = true
    )
    and (
      is_free_preview = true
      or exists (
        select 1
        from public.user_courses uc
        where uc.course_id = course_resources.course_id
          and uc.user_id = auth.uid()
          and uc.status = 'paid'
      )
    )
  );
