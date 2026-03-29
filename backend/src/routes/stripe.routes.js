const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripe.controller');

// Generar sesión de cobro para mandar al frontend
router.post('/create-checkout-session', express.json(), stripeController.createCheckoutSession);

// Webhook seguro de Stripe (necesita el payload en modo raw para descifrar la clave criptográfica)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeController.webhook);

module.exports = router;
