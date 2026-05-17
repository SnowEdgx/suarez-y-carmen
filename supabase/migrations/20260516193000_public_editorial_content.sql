-- Public editorial content managed from Strapi and consumed by the website.

create table if not exists public.home_content (
  id text primary key default 'home' check (id = 'home'),
  hero_eyebrow text,
  hero_title text,
  hero_subtitle text,
  hero_video_url text,
  primary_cta_label text,
  primary_cta_href text,
  secondary_cta_label text,
  secondary_cta_href text,
  is_published boolean default false not null,
  cms_document_id text unique,
  cms_entry_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.faqs (
  id uuid default gen_random_uuid() primary key,
  question text not null,
  answer text not null,
  position integer default 0 not null,
  is_published boolean default false not null,
  cms_document_id text unique,
  cms_entry_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint faqs_question_not_blank check (length(trim(question)) > 0),
  constraint faqs_answer_not_blank check (length(trim(answer)) > 0)
);

create table if not exists public.in_person_classes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  city text,
  venue text,
  schedule text,
  description text,
  image_url text,
  map_url text,
  contact_url text,
  position integer default 0 not null,
  is_active boolean default true not null,
  cms_document_id text unique,
  cms_entry_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint in_person_classes_title_not_blank check (length(trim(title)) > 0)
);

alter table public.home_content enable row level security;
alter table public.faqs enable row level security;
alter table public.in_person_classes enable row level security;

drop policy if exists "Published home content is viewable by everyone" on public.home_content;
create policy "Published home content is viewable by everyone" on public.home_content
  for select using (is_published = true);

drop policy if exists "Published FAQs are viewable by everyone" on public.faqs;
create policy "Published FAQs are viewable by everyone" on public.faqs
  for select using (is_published = true);

drop policy if exists "Active in-person classes are viewable by everyone" on public.in_person_classes;
create policy "Active in-person classes are viewable by everyone" on public.in_person_classes
  for select using (is_active = true);

create index if not exists idx_faqs_public_order
  on public.faqs(is_published, position, created_at);

create index if not exists idx_in_person_classes_public_order
  on public.in_person_classes(is_active, position, created_at);
