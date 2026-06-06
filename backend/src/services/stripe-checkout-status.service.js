const { logger } = require('../utils/logger');
const { supabase } = require('../config/supabase');
const { UUID_REGEX } = require('../utils/validation');
const {
  PURCHASE_STATUS,
  updatePurchaseStatusBySessionId,
  upsertCoursePurchase,
} = require('./purchase.service');
const { extractPaymentIntentId } = require('./stripe-client.service');

async function resolvePaidCheckoutStatus({ session, user }) {
  const courseId = session.metadata?.courseId;
  if (!courseId || !UUID_REGEX.test(courseId)) {
    logger.error('[Stripe Controller] Paid checkout session is missing valid course metadata:', session.id);
    return {
      status: PURCHASE_STATUS.PAID,
      sessionId: session.id,
      accessGranted: false,
      code: 'access_sync_pending',
    };
  }

  let normalizedAmountCents = Number.isInteger(session.amount_total) ? session.amount_total : 0;

  if (!Number.isInteger(normalizedAmountCents) || normalizedAmountCents <= 0) {
    const { data: existingPurchase } = await supabase
      .from('user_courses')
      .select('amount_cents')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingPurchase && Number.isInteger(existingPurchase.amount_cents)) {
      normalizedAmountCents = existingPurchase.amount_cents;
    }
  }

  if (!Number.isInteger(normalizedAmountCents) || normalizedAmountCents <= 0) {
    logger.error('[Stripe Controller] Could not infer paid checkout amount:', session.id);
    return {
      status: PURCHASE_STATUS.PAID,
      sessionId: session.id,
      courseId,
      accessGranted: false,
      code: 'access_sync_pending',
    };
  }

  await upsertCoursePurchase({
    userId: user.id,
    courseId,
    checkoutSessionId: session.id,
    paymentIntentId: extractPaymentIntentId(session.payment_intent),
    amountCents: normalizedAmountCents,
    currency: session.currency || 'eur',
    status: PURCHASE_STATUS.PAID,
  });

  return {
    status: PURCHASE_STATUS.PAID,
    sessionId: session.id,
    courseId,
    accessGranted: true,
  };
}

async function resolveCheckoutSessionStatus({ session, user }) {
  const courseId = session.metadata?.courseId;

  if (session.payment_status === 'paid') {
    return resolvePaidCheckoutStatus({ session, user });
  }

  if (session.status === 'open') {
    await updatePurchaseStatusBySessionId(session.id, PURCHASE_STATUS.PENDING);
    return {
      status: PURCHASE_STATUS.PENDING,
      sessionId: session.id,
      courseId: courseId && UUID_REGEX.test(courseId) ? courseId : null,
      accessGranted: false,
    };
  }

  await updatePurchaseStatusBySessionId(session.id, PURCHASE_STATUS.CANCELED);
  return {
    status: PURCHASE_STATUS.CANCELED,
    sessionId: session.id,
    courseId: courseId && UUID_REGEX.test(courseId) ? courseId : null,
    accessGranted: false,
  };
}

module.exports = {
  resolveCheckoutSessionStatus,
};
