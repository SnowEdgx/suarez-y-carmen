const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

// Solicitar borrado de cuenta (requiere estar autenticado)
router.post('/request-delete-account', userController.requestDeleteAccount);

// Confirmar eliminación desde enlace de correo.
router.post('/confirm-delete-account', userController.confirmDeleteAccount);

module.exports = router;
