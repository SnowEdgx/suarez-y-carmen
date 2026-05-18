const { supabase } = require('../../config/supabase');
const {
  assertSupabase,
  normalizeHref,
  normalizeUrl,
  optionalString,
  resolvePublishedState,
} = require('./validation');

async function upsertHomeContent(entry) {
  const payload = {
    id: 'home',
    hero_eyebrow: optionalString(entry.heroEyebrow, 160),
    hero_title: optionalString(entry.heroTitle, 255),
    hero_subtitle: optionalString(entry.heroSubtitle, 2000),
    hero_video_url: normalizeUrl(entry.heroVideoUrl, 'heroVideoUrl'),
    primary_cta_label: optionalString(entry.primaryCtaLabel, 120),
    primary_cta_href: normalizeHref(entry.primaryCtaHref, 'primaryCtaHref'),
    secondary_cta_label: optionalString(entry.secondaryCtaLabel, 120),
    secondary_cta_href: normalizeHref(entry.secondaryCtaHref, 'secondaryCtaHref'),
    is_published: resolvePublishedState(entry),
    cms_document_id: optionalString(entry.cmsDocumentId, 255),
    cms_entry_id: optionalString(entry.cmsEntryId, 255),
    updated_at: new Date().toISOString(),
  };

  const result = await supabase
    .from('home_content')
    .upsert(payload, { onConflict: 'id' })
    .select('id')
    .single();

  return assertSupabase(result, 'Could not sync home content');
}

async function unpublishHomeContent() {
  const existing = await supabase
    .from('home_content')
    .select('id')
    .eq('id', 'home')
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (!existing.data) return { id: null, skipped: true };

  const result = await supabase
    .from('home_content')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('id', 'home')
    .select('id')
    .single();

  return assertSupabase(result, 'Could not unpublish home content');
}

module.exports = {
  unpublishHomeContent,
  upsertHomeContent,
};
