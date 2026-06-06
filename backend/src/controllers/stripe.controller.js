const { logger } = require('../utils/logger');
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
  getFrontendUrl,
  getReusableCheckoutSession,
  requireStripe,
  sanitizeCheckoutSessionId,
  sanitizeReturnPath,
} = require('../services/stripe-client.service');
const { resolveCheckoutSessionStatus } = require('../services/stripe-checkout-status.service');
const { processStripeEvent } = require('../services/stripe-webhook.service');

function sendClientError(res, status, code, message) {
  return res.status(status).json({ error: message, code });
}

// Creates a secure Checkout session for a single-course purchase.
exports.createCheckoutSession = async (req, res) => {
  try {
    const { courseId, returnPath } = req.body;
    if (!courseId) {
      return sendClientError(res, 400, 'invalid_course', 'courseId es obligatorio.');
    }
    if (typeof courseId !== 'string' || !UUID_REGEX.test(courseId)) {
      return sendClientError(res, 400, 'invalid_course', 'courseId no es válido.');
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return sendClientError(
        res,
        401,
        'authentication_required',
        'No autorizado. Inicia sesión para continuar.'
      );
    }
    if (!isEmailVerified(user)) {
      return sendClientError(res, 403, 'email_not_verified', 'Debes verificar tu correo para completar una compra.');
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price_cents, is_published')
      .eq('id', courseId)
      .maybeSingle();

    if (courseError) throw courseError;
    if (!course) {
      return sendClientError(res, 404, 'course_not_found', 'Curso no encontrado.');
    }

    if (!course.is_published) {
      return sendClientError(res, 403, 'course_unavailable', 'Este curso no está disponible para compra.');
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
      return sendClientError(res, 409, 'already_owned', 'Ya tienes acceso a este curso.');
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
      logger.error('[Stripe Controller] Course has invalid price configuration:', course.id);
      return sendClientError(res, 503, 'checkout_unavailable', 'La compra no está disponible temporalmente.');
    }

    const frontendUrl = getFrontendUrl();
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
    logger.error('[Stripe Controller] Error creating Checkout Session:', err.message);
    return sendClientError(
      res,
      status,
      status >= 500 ? 'payment_error' : 'request_failed',
      'Error procesando la solicitud de pago.'
    );
  }
};

// Verifies checkout status for the authenticated user and repairs access when payment succeeded.
exports.getCheckoutSessionStatus = async (req, res) => {
  try {
    const rawSessionId = req.query.session_id || req.body?.session_id || req.body?.sessionId;
    const checkoutSessionId = sanitizeCheckoutSessionId(rawSessionId);

    if (!checkoutSessionId) {
      return sendClientError(res, 400, 'invalid_checkout_session', 'session_id no es válido.');
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return sendClientError(
        res,
        401,
        'authentication_required',
        'No autorizado. Inicia sesión para continuar.'
      );
    }
    if (!isEmailVerified(user)) {
      return sendClientError(res, 403, 'email_not_verified', 'Debes verificar tu correo para consultar esta compra.');
    }

    const stripeClient = requireStripe();

    let session;
    try {
      session = await stripeClient.checkout.sessions.retrieve(checkoutSessionId);
    } catch (error) {
      if (error?.type === 'StripeInvalidRequestError') {
        return sendClientError(res, 404, 'checkout_session_not_found', 'No encontramos la sesión de checkout.');
      }
      throw error;
    }

    const sessionUserId = session.metadata?.userId || session.client_reference_id;
    if (!sessionUserId || sessionUserId !== user.id) {
      return sendClientError(res, 403, 'checkout_session_forbidden', 'No tienes permisos para consultar esta sesión.');
    }

    return res.json(await resolveCheckoutSessionStatus({ session, user }));
  } catch (err) {
    const status = err.status || 500;
    logger.error('[Stripe Controller] Error checking checkout session status:', err.message);
    return sendClientError(
      res,
      status,
      status >= 500 ? 'checkout_status_error' : 'request_failed',
      'No se pudo consultar el estado del checkout.'
    );
  }
};

// Verifies Stripe events and grants course access after successful payment.
exports.webhook = async (req, res) => {
  let event;

  try {
    const stripeClient = requireStripe();
    const signature = req.headers['stripe-signature'];

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      logger.error('[Stripe Webhook] Webhook secret is not configured.');
      return res.status(503).json({ error: 'Webhook processing unavailable.' });
    }

    event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.warn('[Stripe Webhook] Signature verification error:', err.message);
    return res.status(400).json({ error: 'Webhook request rejected.' });
  }

  try {
    const eventState = await markStripeEventReceived(event);
    if (eventState.duplicate) {
      return res.json({ received: true, duplicate: true });
    }
  } catch (err) {
    logger.error('[Stripe Webhook] Error storing event:', err.message);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }

  try {
    await processStripeEvent(event);
  } catch (err) {
    logger.error('[Stripe Webhook] Processing error:', err.message);
    await rollbackStripeEvent(event.id);
    return res.status(500).json({ error: 'Webhook processing failed.' });
  }

  return res.json({ received: true });
};

