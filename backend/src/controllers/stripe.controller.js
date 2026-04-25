const { createClient } = require('@supabase/supabase-js');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null;

function resolveSupabaseUrl() {
  const rawUrl = process.env.SUPABASE_URL;
  if (!rawUrl) return rawUrl;

  // Running node outside Docker can fail resolving host.docker.internal on some Windows setups.
  if (!process.env.RUNNING_IN_DOCKER && rawUrl.includes('host.docker.internal')) {
    return rawUrl.replace('host.docker.internal', '127.0.0.1');
  }

  return rawUrl;
}

const resolvedSupabaseUrl = resolveSupabaseUrl();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!resolvedSupabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing required Supabase env vars in stripe controller (SUPABASE_URL and service role key).'
  );
}

const supabase = createClient(
  resolvedSupabaseUrl,
  supabaseServiceKey
);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHECKOUT_SESSION_REGEX = /^cs_[A-Za-z0-9_]+$/;
const PURCHASE_STATUS = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  CANCELED: 'canceled',
});

function requireStripe() {
  if (!stripe) {
    const error = new Error('Stripe is not configured in backend. STRIPE_SECRET_KEY is missing.');
    error.status = 503;
    throw error;
  }

  return stripe;
}

async function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}

function isEmailVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

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
    console.error('[Stripe Webhook] Event rollback failed:', error.message);
  }
}

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

// Creates a secure Checkout session for a single-course purchase.
exports.createCheckoutSession = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: 'courseId es obligatorio.' });
    }
    if (typeof courseId !== 'string' || !UUID_REGEX.test(courseId)) {
      return res.status(400).json({ error: 'courseId no es valido.' });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'No autorizado. Inicia sesion para continuar.' });
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
      return res.status(500).json({ error: 'El curso tiene un precio invalido en configuracion.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: course.title || 'Curso en Suarez y Carmen',
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
      success_url: `${frontendUrl}/courses?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/courses?canceled=true`,
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
      return res.status(400).json({ error: 'session_id no es valido.' });
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'No autorizado. Inicia sesion para continuar.' });
    }

    const stripeClient = requireStripe();

    let session;
    try {
      session = await stripeClient.checkout.sessions.retrieve(checkoutSessionId);
    } catch (error) {
      if (error?.type === 'StripeInvalidRequestError') {
        return res.status(404).json({ error: 'No encontramos la sesion de checkout.' });
      }
      throw error;
    }

    const sessionUserId = session.metadata?.userId || session.client_reference_id;
    if (!sessionUserId || sessionUserId !== user.id) {
      return res.status(403).json({ error: 'No tienes permisos para consultar esta sesion.' });
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
          return res.json({
            status: PURCHASE_STATUS.PAID,
            sessionId: session.id,
            courseId,
            accessGranted: false,
            warning: 'Pago confirmado, pero no se pudo inferir el importe para registrar la compra.',
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

      return res.json({
        status: PURCHASE_STATUS.PAID,
        sessionId: session.id,
        accessGranted: false,
        warning: 'Pago confirmado, pero no se pudo identificar el curso en metadata.',
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
      return res.status(503).json({ error: 'Webhook no configurado.' });
    }

    event = stripeClient.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.warn('[Stripe Webhook] Signature verification error:', err.message);
    return res.status(400).json({ error: 'Firma de webhook invalida.' });
  }

  try {
    const eventState = await markStripeEventReceived(event);
    if (eventState.duplicate) {
      return res.json({ received: true, duplicate: true });
    }
  } catch (err) {
    console.error('[Stripe Webhook] Error storing event:', err.message);
    return res.status(500).json({ error: 'No se pudo registrar el evento de Stripe.' });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutSessionCompleted(event.data.object);
      const userId = event.data.object.metadata?.userId || 'unknown';
      const courseId = event.data.object.metadata?.courseId || 'unknown';
      console.log(`[Stripe Webhook] Access granted to user ${userId} for course ${courseId}`);
    }

    if (event.type === 'checkout.session.expired') {
      await updatePurchaseStatusBySessionId(event.data.object.id, PURCHASE_STATUS.CANCELED);
      console.log(`[Stripe Webhook] Checkout session expired: ${event.data.object.id}`);
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      await updatePurchaseStatusBySessionId(event.data.object.id, PURCHASE_STATUS.CANCELED);
      console.log(`[Stripe Webhook] Checkout session payment failed: ${event.data.object.id}`);
    }

    if (event.type === 'charge.refunded') {
      const paymentIntentId = extractPaymentIntentId(event.data.object.payment_intent);
      await updatePurchaseStatusByPaymentIntent(paymentIntentId, PURCHASE_STATUS.REFUNDED);
      console.log(`[Stripe Webhook] Purchase refunded for payment_intent ${paymentIntentId}`);
    }

    if (event.type === 'charge.dispute.created') {
      const paymentIntentId = extractPaymentIntentId(event.data.object.payment_intent);
      await updatePurchaseStatusByPaymentIntent(paymentIntentId, PURCHASE_STATUS.CANCELED);
      console.log(`[Stripe Webhook] Purchase marked canceled due dispute for payment_intent ${paymentIntentId}`);
    }
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err.message);
    await rollbackStripeEvent(event.id);
    return res.status(500).json({ error: 'No se pudo completar el procesamiento del evento.' });
  }

  return res.json({ received: true });
};

