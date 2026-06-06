const { logger } = require('../utils/logger');
const { supabase } = require('../config/supabase');

async function markStripeEventReceived(event) {
  const { error } = await supabase
    .from('stripe_events')
    .insert({ id: event.id, type: event.type });

  if (!error) return { duplicate: false };
  if (error.code === '23505') return { duplicate: true };
  throw error;
}

async function rollbackStripeEvent(eventId) {
  const { error } = await supabase
    .from('stripe_events')
    .delete()
    .eq('id', eventId);

  if (error) {
    logger.error('[Stripe Event Service] Event rollback failed:', error.message);
  }
}

module.exports = {
  markStripeEventReceived,
  rollbackStripeEvent,
};
