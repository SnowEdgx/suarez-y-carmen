-- Checkout hardening:
-- Allow pending purchases to prevent duplicate open Stripe sessions.

update public.user_courses
set status = 'canceled'
where status is null;

alter table public.user_courses
  alter column status set default 'pending';

alter table public.user_courses
  drop constraint if exists user_courses_status_check;

alter table public.user_courses
  add constraint user_courses_status_check
  check (status in ('pending', 'paid', 'refunded', 'canceled'));

create index if not exists idx_user_courses_pending_status
  on public.user_courses(user_id, course_id, status)
  where status = 'pending';
