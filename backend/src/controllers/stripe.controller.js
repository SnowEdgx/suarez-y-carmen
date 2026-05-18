const { supabase } = require('../config/supabase');
const { getAuthenticatedUser, isEmailVerified } = require('../utils/auth');
const { UUID_REGEX } = require('../utils/validation');
const {
  PURCHASE_STATUS,
  updatePurchaseStatusByPaymentIntent,
  updatePurchaseStatusBySessionId,
  upsertCoursePurchase,
} = require('../services/purchase.service');
const {
  markStripeEventReceived,
  rollbackStripeEvent,
} = require('../services/stripe-event.service');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null;
const CHECKOUT_SESSION_REGEX = /^cs_[A-Za-z0-9_]+$/;

function requireStripe() {
  if (!stripe) {
    const error = new Error('Stripe is not configured in backend. STRIPE_SECRET_KEY is missing.');
    error.status = 503;
    throw error;
  }

  return stripe;
}

async function getReusableCheckoutSession(stripeClient, checkoutSessionId) {
  if (!checkoutSessionId) return null;

  try {
    const existingSession = await stripeClient.checkout.sessions.retrieve(checkoutSessionId);
    if (
      existingSession &&
      existingSession.status === 'open' &&
      existingSession.payment_status !== 'paid' &&
      existingSession.url
    ) {
      return existingSession;
    }
  } catch (error) {
    console.warn('[Stripe Controller] Could not retrieve prior checkout session:', error.message);
  }

  return null;
}

async function handleCheckoutSessionCompleted(session) {
  if (session.payment_status !== 'paid') return;

  const userId = session.metadata?.userId;
  const courseId = session.metadata?.courseId;

  if (!userId || !courseId) {
    throw new Error('Missing checkout metadata (userId/courseId).');
  }

  const amountCents = session.amount_total || 0;
  const currency = session.currency || 'eur';
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id || null;

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

function extractPaymentIntentId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.id === 'string') return value.id;
  return null;
}

function sanitizeCheckoutSessionId(rawValue) {
  if (typeof rawValue !== 'string') return null;
  const value = rawValue.trim();
  if (!CHECKOUT_SESSION_REGEX.test(value)) return null;
  return value;
}

function sanitizeReturnPath(rawValue) {
  if (typeof rawValue !== 'string') return '/courses';

  const value = rawValue.trim();
  if (!value || value.length > 500) return '/courses';
  if (!value.startsWith('/') || value.startsWith('//')) return '/courses';
  if (/[\r\n\t]/.test(value)) return '/courses';
  if (value !== '/courses' && !value.startsWith('/courses/')) return '/courses';

  return value;
}

function buildFrontendReturnUrl(frontendUrl, returnPath, params) {
  const baseUrl = frontendUrl.replace(/\/+$/, '');
  const separator = returnPath.includes('?') ? '&' : '?';
  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${value}`)
    .join('&');

  return `${baseUrl}${returnPath}${separator}${query}`;
}

// Creates a secure Checkout session for a single-course purchase.
exports.createCheckoutSession = async (req, res) => {
  try {
    const { courseId, returnPath } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: 'courseId es obligatorio.' });
    }
    if (typeof courseId !== 'string' || !UUID_REGEX.test(courseId)) {
      return res.status(400).json({ error: 'courseId no es válido.' });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'No autorizado. Inicia sesión para continuar.' });
    }
    if (!isEmailVerified(user)) {
      return res.status(403).json({ error: 'Debes verificar tu correo para completar una compra.' });
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price_cents, is_published')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError) throw courseError;
    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado.' });
    }

    if (!course.is_published) {
      return res.status(403).json({ error: 'Este curso no esta disponible para compra.' });
    }

    const stripeClient = requireStripe();

    const { data: existingPurchase, error: existingPurchaseError } = await supabase
      .from('user_courses')
      .select('id, status, stripe_checkout_session_id')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .maybeSingle();

    if (existingPurchaseError) throw existingPurchaseError;
    if (existingPurchase?.status === PURCHASE_STATUS.PAID) {
      return res.status(409).json({ error: 'Ya tienes acceso a este curso.' });
    }

    if (existingPurchase?.status === PURCHASE_STATUS.PENDING) {
      const reusableSession = await getReusableCheckoutSession(
        stripeClient,
        existingPurchase.stripe_checkout_session_id
      );
      if (reusableSession) {
        return res.json({ id: reusableSession.id, url: reusableSession.url, reused: true });
      }
    }

    if (!Number.isInteger(course.price_cents) || course.price_cents <= 0) {
      console.error('[Stripe Controller] Course has invalid price configuration:', course.id);
      return res.status(503).json({ error: 'La compra no está disponible temporalmente.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const safeReturnPath = sanitizeReturnPath(returnPath);

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: course.title || 'Curso en Suárez y Carmen',
            },
            unit_amount: course.price_cents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        userId: user.id,
        courseId: course.id,
      },
      client_reference_id: user.id,
      success_url: buildFrontendReturnUrl(frontendUrl, safeReturnPath, {
        success: 'true',
        session_id: '{CHECKOUT_SESSION_ID}',
      }),
      cancel_url: buildFrontendReturnUrl(frontendUrl, safeReturnPath, {
        canceled: 'true',
      }),
    });

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null;

    await upsertCoursePurchase({
      userId: user.id,
      courseId: course.id,
      checkoutSessionId: session.id,
      paymentIntentId,
      amountCents: course.price_cents,
      currency: 'eur',
      status: PURCHASE_STATUS.PENDING,
    });

    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    const status = err.status || 500;
    console.error('[Stripe Controller] Error creating Checkout Session:', err.message);
    return res.status(status).json({ error: 'Error procesando la solicitud de pago.' });
  }
};

// Verifies checkout status for the authenticated user and repairs access when payment succeeded.
exports.getCheckoutSessionStatus = async (req, res) => {
  try {
    const rawSessionId = req.query.session_id || req.body?.session_id || req.body?.sessionId;
    const checkoutSessionId = sanitizeCheckoutSessionId(rawSessionId);

    if (!checkoutSessionId) {
      return res.status(400).json({ error: 'session_id no es válido.' });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'No autorizado. Inicia sesión para continuar.' });
    }

    const stripeClient = requireStripe();

    let session;
    try {
      session = await stripeClient.checkout.sessions.retrieve(checkoutSessionId);
    } catch (error) {
      if (error?.type === 'StripeInvalidRequestError') {
        return res.status(404).json({ error: 'No encontramos la sesión de checkout.' });
      }
      throw error;
    }

    const sessionUserId = session.metadata?.userId || session.client_reference_id;
    if (!sessionUserId || sessionUserId !== user.id) {
      return res.status(403).json({ error: 'No tienes permisos para consultar esta sesión.' });
    }

    const paymentIntentId = extractPaymentIntentId(session.payment_intent);
    const courseId = session.metadata?.courseId;
    const amountCents = Number.isInteger(session.amount_total) ? session.amount_total : 0;
    const currency = session.currency || 'eur';

    if (session.payment_status === 'paid') {
      if (courseId && UUID_REGEX.test(courseId)) {
        let normalizedAmountCents = amountCents;

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
          console.error('[Stripe Controller] Could not infer paid checkout amount:', session.id);
          return res.json({
            status: PURCHASE_STATUS.PAID,
            sessionId: session.id,
            courseId,
            accessGranted: false,
            code: 'access_sync_pending',
          });
        }

        await upsertCoursePurchase({
          userId: user.id,
          courseId,
          checkoutSessionId: session.id,
          paymentIntentId,
          amountCents: normalizedAmountCents,
          currency,
          status: PURCHASE_STATUS.PAID,
        });

        return res.json({
          status: PURCHASE_STATUS.PAID,
          sessionId: session.id,
          courseId,
          accessGranted: true,
        });
      }

      console.error('[Stripe Controller] Paid checkout session is missing valid course metadata:', session.id);
      return res.json({
        status: PURCHASE_STATUS.PAID,
        sessionId: session.id,
        accessGranted: false,
        code: 'access_sync_pending',
      });
    }

    if (session.status === 'open') {
      await updatePurchaseStatusBySessionId(session.id, PURCHASE_STATUS.PENDING);
      return res.json({
        status: PURCHASE_STATUS.PENDING,
        sessionId: session.id,
        courseId: courseId && UUID_REGEX.test(courseId) ? courseId : null,
        accessGranted: false,
      });
    }

    await updatePurchaseStatusBySessionId(session.id, PURCHASE_STATUS.CANCELED);
    return res.json({
      status: PURCHASE_STATUS.CANCELED,
      sessionId: session.id,
      courseId: courseId && UUID_REGEX.test(courseId) ? courseId : null,
      accessGranted: false,
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('[Stripe Controller] Error checking checkout session status:', err.message);
    return res.status(status).json({ error: 'No se pudo consultar el estado del checkout.' });
  }
};

// Verifies Stripe events and grants course access after successful payment.
exports.webhook = async (req, res) => {
  let event;

  try {
    const stripeClient = requireStripe();
    const signature = req.headers['stripe-signature'];

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('[Stripe Webhook] Webhook secret is not configured.');
      return res.status(503).json({ error: 'Webhook processing unavailable.' });
    }

    event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.warn('[Stripe Webhook] Signature verification error:', err.message);
    return res.status(400).json({ error: 'Webhook request rejected.' });
  }

  try {
    const eventState = await markStripeEventReceived(event);
    if (eventState.duplicate) {
      return res.json({ received: true, duplicate: true });
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error storing event:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }

  try {
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
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err.message);
    await rollbackStripeEvent(event.id);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }

  return res.json({ received: true });
};

