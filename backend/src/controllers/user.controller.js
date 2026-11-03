const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { buildAccountDeletionEmail } = require('../services/account-deletion-email.service');
const { getFrontendUrl } = require('../services/stripe-client.service');
const { getAuthenticatedUser, isEmailVerified } = require('../utils/auth');
const { isUuid } = require('../utils/validation');

const DELETION_TOKEN_TTL_MS = 60 * 60 * 1000;
// Minimum time between two deletion emails for the same account, regardless of IP.
const DELETION_REQUEST_COOLDOWN_MS = 2 * 60 * 1000;
const DEFAULT_RESEND_FROM_EMAIL = 'academy@mail.suarezycarmenbachata.com';

function sendClientError(res, status, code, message) {
  return res.status(status).json({ error: message, code });
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_RESEND_FROM_EMAIL,
  };
}

async function purgeExpiredDeletionTokens() {
  const { error } = await supabase
    .from('account_deletion_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.warn('[Delete Account] Could not purge expired tokens:', error.message);
  }
}

async function hasRecentDeletionRequest(userId) {
  const since = new Date(Date.now() - DELETION_REQUEST_COOLDOWN_MS).toISOString();
  const { data, error } = await supabase
    .from('account_deletion_tokens')
    .select('token')
    .eq('user_id', userId)
    .gte('created_at', since)
    .limit(1);

  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

async function replaceDeletionToken(userId) {
  // Only the most recent link stays valid.
  const { error: deleteError } = await supabase
    .from('account_deletion_tokens')
    .delete()
    .eq('user_id', userId);
  if (deleteError) throw deleteError;

  const token = crypto.randomUUID();
  const { error: insertError } = await supabase
    .from('account_deletion_tokens')
    .insert({
      token,
      user_id: userId,
      expires_at: new Date(Date.now() + DELETION_TOKEN_TTL_MS).toISOString(),
    });
  if (insertError) throw insertError;

  return token;
}

async function sendDeletionEmail({ resendConfig, email, confirmLink }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Suárez y Carmen <${resendConfig.from}>`,
      to: [email],
      subject: 'Confirma la eliminación de tu cuenta | Suárez y Carmen',
      html: buildAccountDeletionEmail({ confirmLink }),
    }),
  });

  if (!response.ok) {
    const status = response.status;
    await response.text().catch(() => '');
    throw new Error(`Resend responded with status ${status}.`);
  }
}

async function requestDeleteAccount(req, res) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return sendClientError(
        res,
        401,
        'authentication_required',
        'No autorizado. Inicia sesión para realizar esta acción.'
      );
    }

    if (!isEmailVerified(user)) {
      return sendClientError(
        res,
        403,
        'email_not_verified',
        'Verifica tu correo antes de solicitar el borrado de tu cuenta.'
      );
    }

    if (!user.email) {
      return sendClientError(res, 400, 'email_missing', 'El usuario no tiene una dirección de correo asociada.');
    }

    // Validate configuration before writing anything, so no orphan tokens are left behind.
    const resendConfig = getResendConfig();
    if (!resendConfig) {
      console.error('[Delete Account] RESEND_API_KEY is not configured.');
      return sendClientError(res, 503, 'email_unavailable', 'El servicio de correo electrónico no está disponible.');
    }

    let frontendUrl;
    try {
      frontendUrl = getFrontendUrl();
    } catch (configError) {
      console.error('[Delete Account] Invalid FRONTEND_URL configuration:', configError.message);
      return sendClientError(res, 503, 'email_unavailable', 'El servicio de correo electrónico no está disponible.');
    }

    if (await hasRecentDeletionRequest(user.id)) {
      return sendClientError(
        res,
        429,
        'deletion_recently_requested',
        'Ya te hemos enviado un correo hace poco. Revisa tu bandeja de entrada o espera unos minutos.'
      );
    }

    await purgeExpiredDeletionTokens();
    const token = await replaceDeletionToken(user.id);
    const confirmLink = `${frontendUrl}/auth/delete-account?token=${encodeURIComponent(token)}`;

    try {
      await sendDeletionEmail({ resendConfig, email: user.email, confirmLink });
    } catch (mailError) {
      console.error('[Delete Account] Could not send confirmation email:', mailError.message);
      // Remove the unusable token so the user can retry immediately.
      await supabase.from('account_deletion_tokens').delete().eq('token', token);
      return sendClientError(
        res,
        502,
        'email_send_failed',
        'No pudimos enviar el correo de confirmación. Inténtalo de nuevo en unos minutos.'
      );
    }

    return res.json({
      success: true,
      message: 'Te hemos enviado un correo de confirmación para eliminar tu cuenta.',
    });
  } catch (err) {
    console.error('[Delete Account] Request failed:', err?.message || 'Unknown error');
    return sendClientError(res, 500, 'deletion_request_failed', 'No pudimos procesar tu solicitud en este momento.');
  }
}

async function confirmDeleteAccount(req, res, next) {
  try {
    const token = req.body?.token;

    if (!isUuid(token)) {
      return sendClientError(
        res,
        400,
        'invalid_token',
        'Token de confirmación ausente o con formato incorrecto.'
      );
    }

    const { data: request, error: fetchError } = await supabase
      .from('account_deletion_tokens')
      .select('token, user_id, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!request) {
      return sendClientError(
        res,
        400,
        'invalid_token',
        'El enlace de confirmación no es válido o ya ha sido utilizado.'
      );
    }

    if (new Date(request.expires_at).getTime() <= Date.now()) {
      await supabase.from('account_deletion_tokens').delete().eq('token', token);
      return sendClientError(
        res,
        400,
        'expired_token',
        'El enlace de confirmación ha expirado. Solicita uno nuevo desde tu perfil.'
      );
    }

    // Supabase cascades related user data (profile, purchases, progress, devices and
    // these tokens) through the foreign keys defined in migrations.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(request.user_id);

    if (deleteError) {
      console.error('[Delete Account] Supabase delete user failed:', deleteError.message);
      return sendClientError(
        res,
        500,
        'deletion_failed',
        'No se pudo completar el borrado de tu cuenta. Contacta con soporte.'
      );
    }

    return res.json({ success: true, message: 'Tu cuenta ha sido eliminada de forma definitiva.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  confirmDeleteAccount,
  requestDeleteAccount,
};
