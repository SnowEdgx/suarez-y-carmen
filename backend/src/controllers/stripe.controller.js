const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Crear una sesión de pago para comprar un curso
exports.createCheckoutSession = async (req, res) => {
  try {
    const { courseId, courseName, price, userId } = req.body;

    if (!courseId || !price || !userId) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos.' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: courseName || 'Curso en Suárez y Carmen',
            },
            unit_amount: Math.round(price * 100), // En céntimos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Metadata importante para el Webhook (Saber a quién darle acceso al curso tras pagar)
      metadata: {
        userId,
        courseId,
      },
      success_url: `${process.env.FRONTEND_URL}/courses?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/courses?canceled=true`,
    });

    res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('[Stripe Controller] Error creando Checkout Session:', err.message);
    res.status(500).json({ error: 'Error procesando la solicitud de pago.' });
  }
};

// Escudo Webhook seguro preparado para Stripe
exports.webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // req.body DEBE SER un buffer raw para validar la firma de seguridad
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.warn(`[Stripe Webhook] Error verificando firma criptográfica:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar el evento de cuando el pago se completa de forma final
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Aquí es donde en el futuro le darás acceso al curso al usuario
    const userId = session.metadata.userId;
    const courseId = session.metadata.courseId;

    console.log(`[Extito] Pago recibido para el usuario ${userId} y curso ${courseId}`);
    // Ejemplo (TODO): await supabase.from('user_courses').insert({ user_id: userId, course_id: courseId });
  }

  res.json({ received: true });
};
