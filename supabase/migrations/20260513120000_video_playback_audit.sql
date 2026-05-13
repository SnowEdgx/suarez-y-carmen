-- Audit protected video access without storing raw IP addresses or user agents.

create table if not exists public.video_playback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  course_id uuid references public.courses(id) on delete cascade,
  lesson_id uuid references public.lessons(id) on delete cascade,
  token_nonce uuid,
  event_type text not null check (
    event_type in (
      'token_issued',
      'stream_started',
      'stream_denied',
      'stream_error'
    )
  ),
  status_code integer check (status_code is null or status_code between 100 and 599),
  request_ip_hash text,
  user_agent_hash text,
  range_header text,
  error_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.video_playback_events enable row level security;

create index if not exists idx_video_playback_events_user_created
  on public.video_playback_events(user_id, created_at desc);

create index if not exists idx_video_playback_events_lesson_created
  on public.video_playback_events(lesson_id, created_at desc);

create index if not exists idx_video_playback_events_token_created
  on public.video_playback_events(token_nonce, created_at desc);

create index if not exists idx_video_playback_events_event_created
  on public.video_playback_events(event_type, created_at desc);
