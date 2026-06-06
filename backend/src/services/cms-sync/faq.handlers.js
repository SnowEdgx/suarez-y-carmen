const { supabase } = require('../../config/supabase');
const {
  assertSupabase,
  optionalInteger,
  optionalString,
  requiredString,
  resolvePublishedState,
} = require('./validation');
const { findFaq } = require('./finders');

async function upsertFaq(entry) {
  const question = requiredString(entry.question, 'question', 255);
  const answer = requiredString(entry.answer, 'answer', 10000);
  const existing = await findFaq({ ...entry, question });
  const payload = {
    question,
    answer,
    position: optionalInteger(entry.position, 'position', { min: 0, max: 1000 }) ?? 0,
    is_published: resolvePublishedState(entry),
    cms_document_id: optionalString(entry.cmsDocumentId, 255),
    cms_entry_id: optionalString(entry.cmsEntryId, 255),
    updated_at: new Date().toISOString(),
  };

  const result = existing?.id
    ? await supabase.from('faqs').update(payload).eq('id', existing.id).select('id').single()
    : await supabase.from('faqs').insert(payload).select('id').single();

  return assertSupabase(result, 'Could not sync FAQ');
}

async function unpublishFaq(entry) {
  const cmsDocumentId = optionalString(entry.cmsDocumentId, 255);
  if (!cmsDocumentId) return { id: null, skipped: true };

  const existing = await findFaq({ cmsDocumentId }, { allowFallback: false });
  if (!existing?.id) return { id: null, skipped: true };

  const result = await supabase
    .from('faqs')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('id', existing.id)
    .select('id')
    .single();

  return assertSupabase(result, 'Could not unpublish FAQ');
}

module.exports = {
  unpublishFaq,
  upsertFaq,
};
