-- Track active video playback devices per user to reduce account sharing.

create table if not exists public.user_video_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  device_id_hash text not null,
  user_agent_hash text,
  first_seen_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_seen_at timestamp with time zone default timezone('utc'::text, now()) not null,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, device_id_hash)
);

alter table public.user_video_devices enable row level security;

create index if not exists idx_user_video_devices_user_last_seen
  on public.user_video_devices(user_id, last_seen_at desc);

create index if not exists idx_user_video_devices_user_active
  on public.user_video_devices(user_id, revoked_at, last_seen_at desc);

alter table public.video_playback_events
  drop constraint if exists video_playback_events_event_type_check;

alter table public.video_playback_events
  add constraint video_playback_events_event_type_check
  check (
    event_type in (
      'token_issued',
      'token_denied',
      'stream_started',
      'stream_denied',
      'stream_error'
    )
  );
