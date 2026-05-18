const {
  PURCHASE_STATUS,
  updatePurchaseStatusByPaymentIntent,
  updatePurchaseStatusBySessionId,
  upsertCoursePurchase,
} = require('./purchase.service');
const { extractPaymentIntentId } = require('./stripe-client.service');

async function handleCheckoutSessionCompleted(session) {
  if (session.payment_status !== 'paid') return;

  const userId = session.metadata?.userId;
  const courseId = session.metadata?.courseId;

  if (!userId || !courseId) {
    throw new Error('Missing checkout metadata (userId/courseId).');
  }

  const amountCents = session.amount_total || 0;
  const currency = session.currency || 'eur';
  const paymentIntentId = extractPaymentIntentId(session.payment_intent);

  await upsertCoursePurchase({
    userId,
    courseId,
    checkoutSessionId: session.id,
    paymentIntentId,
    amountCents,
    currency,
    status: PURCHASE_STATUS.PAID,
  });
}

async function processStripeEvent(event) {
  if (event.type === 'checkout.session.completed') {
    await handleCheckoutSessionCompleted(event.data.object);
    console.log('[Stripe Webhook] Checkout session completed and access processed.');
  }

  if (event.type === 'checkout.session.expired') {
    await updatePurchaseStatusBySessionId(event.data.object.id, PURCHASE_STATUS.CANCELED);
    console.log('[Stripe Webhook] Checkout session expiration processed.');
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    await updatePurchaseStatusBySessionId(event.data.object.id, PURCHASE_STATUS.CANCELED);
    console.log('[Stripe Webhook] Async payment failure processed.');
  }

  if (event.type === 'charge.refunded') {
    const paymentIntentId = extractPaymentIntentId(event.data.object.payment_intent);
    await updatePurchaseStatusByPaymentIntent(paymentIntentId, PURCHASE_STATUS.REFUNDED);
    console.log('[Stripe Webhook] Refund event processed.');
  }

  if (event.type === 'charge.dispute.created') {
    const paymentIntentId = extractPaymentIntentId(event.data.object.payment_intent);
    await updatePurchaseStatusByPaymentIntent(paymentIntentId, PURCHASE_STATUS.CANCELED);
    console.log('[Stripe Webhook] Dispute event processed.');
  }
}

module.exports = {
  processStripeEvent,
};
