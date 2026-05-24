-- Reduce client-side database grants to the columns and operations used by the web app.
-- RLS remains the main authorization layer, but table privileges should not expose
-- private storage paths, payment identifiers or CMS synchronization metadata.

revoke all on public.courses from anon, authenticated;
revoke all on public.lessons from anon, authenticated;
revoke all on public.course_resources from anon, authenticated;
revoke all on public.events from anon, authenticated;
revoke all on public.home_content from anon, authenticated;
revoke all on public.faqs from anon, authenticated;
revoke all on public.in_person_classes from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
revoke all on public.user_courses from anon, authenticated;
revoke all on public.user_progress from anon, authenticated;
revoke all on public.user_video_devices from anon, authenticated;
revoke all on public.video_playback_events from anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;

grant select (
  id,
  title,
  slug,
  description,
  cover_image_url,
  level,
  is_published,
  price_cents,
  created_at,
  updated_at
) on public.courses to anon, authenticated;

grant select (
  id,
  course_id,
  title,
  description,
  duration_seconds,
  position,
  is_free_preview,
  is_published,
  created_at,
  updated_at
) on public.lessons to anon, authenticated;

grant select (
  id,
  course_id,
  title,
  description,
  file_name,
  mime_type,
  position,
  is_free_preview,
  is_published,
  created_at,
  updated_at
) on public.course_resources to anon, authenticated;

grant select (
  id,
  title,
  city,
  event_date,
  end_date,
  type,
  image_url,
  location_url,
  ticket_url,
  is_active,
  created_at,
  updated_at
) on public.events to anon, authenticated;

grant select (
  id,
  hero_eyebrow,
  hero_title,
  hero_subtitle,
  hero_video_url,
  primary_cta_label,
  primary_cta_href,
  secondary_cta_label,
  secondary_cta_href,
  is_published,
  created_at,
  updated_at
) on public.home_content to anon, authenticated;

grant select (
  id,
  question,
  answer,
  position,
  is_published,
  created_at,
  updated_at
) on public.faqs to anon, authenticated;

grant select (
  id,
  title,
  city,
  venue,
  schedule,
  description,
  image_url,
  map_url,
  contact_url,
  position,
  is_active,
  created_at,
  updated_at
) on public.in_person_classes to anon, authenticated;

grant select (
  id,
  email,
  full_name,
  avatar_url,
  role,
  created_at,
  updated_at
) on public.profiles to authenticated;

grant insert (
  id,
  full_name,
  avatar_url,
  updated_at
) on public.profiles to authenticated;

grant update (
  full_name,
  avatar_url,
  updated_at
) on public.profiles to authenticated;

grant select (
  id,
  user_id,
  course_id,
  amount_cents,
  currency,
  status,
  created_at
) on public.user_courses to authenticated;

-- Public lesson/resource policies reference user_courses to decide paid access.
-- Anonymous users still see no purchase rows because user_courses RLS requires auth.uid().
grant select (
  user_id,
  course_id,
  status
) on public.user_courses to anon;

grant select (
  id,
  user_id,
  lesson_id,
  is_completed,
  completed_at
) on public.user_progress to authenticated;

grant insert (
  user_id,
  lesson_id,
  is_completed,
  completed_at
) on public.user_progress to authenticated;

grant update (
  is_completed,
  completed_at
) on public.user_progress to authenticated;
