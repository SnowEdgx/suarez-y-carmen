const { supabase } = require('../config/supabase');
const { getAuthenticatedUser, isEmailVerified } = require('../utils/auth');
const { UUID_REGEX } = require('../utils/validation');
const {
  PURCHASE_STATUS,
  upsertCoursePurchase,
} = require('../services/purchase.service');
const {
  markStripeEventReceived,
  rollbackStripeEvent,
} = require('../services/stripe-event.service');
const {
  buildFrontendReturnUrl,
  getReusableCheckoutSession,
  requireStripe,
  sanitizeCheckoutSessionId,
  sanitizeReturnPath,
} = require('../services/stripe-client.service');
const { resolveCheckoutSessionStatus } = require('../services/stripe-checkout-status.service');
const { processStripeEvent } = require('../services/stripe-webhook.service');

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

    return res.json(await resolveCheckoutSessionStatus({ session, user }));
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
    await processStripeEvent(event);
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err.message);
    await rollbackStripeEvent(event.id);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }

  return res.json({ received: true });
};

