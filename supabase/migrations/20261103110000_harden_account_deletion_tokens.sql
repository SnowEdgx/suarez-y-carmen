-- Objects created after 20260524154000_restrict_client_table_grants.sql inherited
-- Supabase default privileges (every operation for anon and authenticated).
-- Align them with the least-privilege policy used by the rest of the schema.

-- Account deletion tokens are only read and written by the backend service role.
-- RLS already hides rows, but TRUNCATE is not covered by RLS, so remove the grants too.
revoke all on public.account_deletion_tokens from anon, authenticated;

-- Public projections are read-only for web clients.
revoke all on public.public_lessons from anon, authenticated;
grant select on public.public_lessons to anon, authenticated;

revoke all on public.public_course_resources from anon, authenticated;
grant select on public.public_course_resources to anon, authenticated;

-- The backend replaces a user's pending tokens and purges expired ones.
create index if not exists idx_account_deletion_tokens_user_id
  on public.account_deletion_tokens(user_id);

create index if not exists idx_account_deletion_tokens_expires_at
  on public.account_deletion_tokens(expires_at);
