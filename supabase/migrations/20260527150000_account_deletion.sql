-- Table to store account deletion verification tokens
create table if not exists public.account_deletion_tokens (
  token uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.account_deletion_tokens enable row level security;

comment on table public.account_deletion_tokens is
  'Temporary verification tokens used for secure user account deletion requests confirmation via email.';
