const { supabase } = require('../config/supabase');

const PURCHASE_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  CANCELED: 'canceled',
});

async function upsertCoursePurchase({
  userId,
  courseId,
  checkoutSessionId,
  paymentIntentId,
  amountCents,
  currency,
  status,
}) {
  const { error } = await supabase
    .from('user_courses')
    .upsert(
      {
        user_id: userId,
        course_id: courseId,
        stripe_checkout_session_id: checkoutSessionId,
        stripe_payment_intent_id: paymentIntentId,
        amount_cents: amountCents,
        currency,
        status,
      },
      { onConflict: 'user_id,course_id' }
    );

  if (error) throw error;
}

async function updatePurchaseStatusByPaymentIntent(paymentIntentId, status) {
  if (!paymentIntentId) return;

  const { error } = await supabase
    .from('user_courses')
    .update({ status })
    .eq('stripe_payment_intent_id', paymentIntentId);

  if (error) throw error;
}

async function updatePurchaseStatusBySessionId(checkoutSessionId, status) {
  if (!checkoutSessionId) return;

  const { error } = await supabase
    .from('user_courses')
    .update({ status })
    .eq('stripe_checkout_session_id', checkoutSessionId);

  if (error) throw error;
}

module.exports = {
  PURCHASE_STATUS,
  updatePurchaseStatusByPaymentIntent,
  updatePurchaseStatusBySessionId,
  upsertCoursePurchase,
};
