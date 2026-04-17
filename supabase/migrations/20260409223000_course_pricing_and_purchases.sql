-- Course pricing + one-time purchases foundation

-- 1) Add explicit price to courses for secure server-side checkout.
alter table public.courses
  add column if not exists price_cents integer;

update public.courses
set price_cents = 2900
where price_cents is null;

alter table public.courses
  alter column price_cents set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'courses_price_cents_check'
  ) then
    alter table public.courses
      add constraint courses_price_cents_check check (price_cents > 0);
  end if;
end
$$;

-- 2) Purchases table for one-time course access.
create table if not exists public.user_courses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  stripe_checkout_session_id text unique not null,
  stripe_payment_intent_id text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'eur',
  status text not null default 'paid' check (status in ('paid', 'refunded', 'canceled')),
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique (user_id, course_id)
);

-- 3) Webhook idempotency table.
create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4) RLS for purchases (users can read only their own purchases).
alter table public.user_courses enable row level security;
alter table public.stripe_events enable row level security;

drop policy if exists "Users can view own course purchases" on public.user_courses;
create policy "Users can view own course purchases" on public.user_courses
  for select using (auth.uid() = user_id);
