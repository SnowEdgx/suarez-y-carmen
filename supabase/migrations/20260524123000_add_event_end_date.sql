-- Support multi-day events without hiding active events after their start date.

alter table public.events
  add column if not exists end_date timestamp with time zone;

create index if not exists idx_events_active_date_range
  on public.events(is_active, event_date, end_date);
