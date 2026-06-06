const { logger } = require('../utils/logger');
const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { buildAccountDeletionEmail } = require('../services/account-deletion-email.service');
const { getAuthenticatedUser } = require('../utils/auth');
const { isUuid } = require('../utils/validation');

async function requestDeleteAccount(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'No autorizado. Inicia sesión para realizar esta acción.' });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'El usuario no tiene una dirección de correo asociada.' });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase
      .from('account_deletion_tokens')
      .insert({
        token,
        user_id: user.id,
        expires_at: expiresAt,
      });

    if (dbError) {
      logger.error('[Delete Account] Database insert failed:', dbError.message);
      return res.status(500).json({ error: 'No pudimos procesar tu solicitud en este momento.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const confirmLink = `${frontendUrl}/auth/delete-account?token=${token}`;

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL || 'academy@mail.suarezycarmenbachata.com';

    if (!resendApiKey) {
      logger.error('[Delete Account] RESEND_API_KEY is not defined in environment variables.');
      return res.status(500).json({ error: 'El servicio de correo electrónico no está configurado.' });
    }

    const htmlContent = buildAccountDeletionEmail({ confirmLink });

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Suárez y Carmen <${resendFrom}>`,
          to: [user.email],
          subject: 'Confirma la eliminación de tu cuenta | Suárez y Carmen',
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        logger.error('[Delete Account] Resend API error status:', response.status, errBody);
        return res.status(500).json({ error: 'El servicio de correo falló al enviar la confirmación.' });
      }
    } catch (mailError) {
      logger.error('[Delete Account] Network error while calling Resend:', mailError.message);
      return res.status(500).json({ error: 'Error de red al enviar el correo de confirmación.' });
    }

    return res.json({ success: true, message: 'Te hemos enviado un correo de confirmación para eliminar tu cuenta.' });
  } catch (err) {
    next(err);
  }
}

async function confirmDeleteAccount(req, res, next) {
  try {
    const { token } = req.body;

    if (!token || !isUuid(token)) {
      return res.status(400).json({ error: 'Token de confirmación ausente o con formato incorrecto.' });
    }

    const { data: request, error: fetchError } = await supabase
      .from('account_deletion_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !request) {
      return res.status(400).json({ error: 'El enlace de confirmación no es válido o ya ha sido utilizado.' });
    }

    const now = new Date();
    const expiresAt = new Date(request.expires_at);
    if (expiresAt < now) {
      return res.status(400).json({ error: 'El enlace de confirmación ha expirado. Solicita uno nuevo desde tu perfil.' });
    }

    // Supabase cascades related user data through the foreign keys defined in migrations.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(request.user_id);

    if (deleteError) {
      logger.error('[Delete Account] Supabase delete user failed:', deleteError.message);
      return res.status(500).json({ error: 'No se pudo completar el borrado de tu cuenta. Contacta con soporte.' });
    }

    return res.json({ success: true, message: 'Tu cuenta ha sido eliminada de forma definitiva.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requestDeleteAccount,
  confirmDeleteAccount,
};
