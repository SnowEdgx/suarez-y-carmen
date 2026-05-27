const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { getAuthenticatedUser } = require('../utils/auth');
const { isUuid } = require('../utils/validation');

/**
 * Solicita la eliminación de la cuenta de un usuario autenticado.
 * Genera un token temporal y envía un correo electrónico de confirmación con Resend.
 */
async function requestDeleteAccount(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: 'No autorizado. Inicia sesión para realizar esta acción.' });
    }

    if (!user.email) {
      return res.status(400).json({ error: 'El usuario no tiene una dirección de correo asociada.' });
    }

    // Generar un token único y seguro (UUID v4)
    const token = crypto.randomUUID();
    // Expiración del token: 1 hora
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Guardar el token en la base de datos
    const { error: dbError } = await supabase
      .from('account_deletion_tokens')
      .insert({
        token,
        user_id: user.id,
        expires_at: expiresAt,
      });

    if (dbError) {
      console.error('[Delete Account] Database insert failed:', dbError.message);
      return res.status(500).json({ error: 'No pudimos procesar tu solicitud en este momento.' });
    }

    // Construir enlace de confirmación
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const confirmLink = `${frontendUrl}/auth/delete-account?token=${token}`;

    // Obtener variables de Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL || 'academy@mail.suarezycarmenbachata.com';

    if (!resendApiKey) {
      console.error('[Delete Account] RESEND_API_KEY is not defined in environment variables.');
      return res.status(500).json({ error: 'El servicio de correo electrónico no está configurado.' });
    }

    // Diseño premium del correo de confirmación de eliminación de cuenta
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirma la eliminación de tu cuenta</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0a0a0a;
            color: #e5e5e5;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #121212;
            border: 1px solid #262626;
            border-radius: 16px;
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #1f0606 0%, #3b0707 100%);
            padding: 30px 20px;
            text-align: center;
            border-bottom: 1px solid #262626;
          }
          .header h1 {
            color: #ffffff;
            font-size: 24px;
            margin: 0;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .content {
            padding: 40px 30px;
          }
          .content p {
            font-size: 16px;
            line-height: 1.6;
            color: #a3a3a3;
            margin: 0 0 20px 0;
          }
          .warning-box {
            background-color: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .warning-box p {
            color: #fca5a5;
            font-size: 14px;
            margin: 0;
          }
          .warning-title {
            font-weight: bold;
            color: #ef4444 !important;
            margin-bottom: 6px !important;
          }
          .btn-container {
            text-align: center;
            margin: 30px 0;
          }
          .btn {
            display: inline-block;
            background-color: #dc2626;
            color: #ffffff !important;
            text-decoration: none;
            padding: 14px 28px;
            font-weight: 600;
            font-size: 15px;
            border-radius: 8px;
            transition: background-color 0.2s;
          }
          .footer {
            background-color: #0e0e0e;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #737373;
            border-top: 1px solid #262626;
          }
          .footer a {
            color: #a3a3a3;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Suárez y Carmen Bachata</h1>
          </div>
          <div class="content">
            <p>Hola,</p>
            <p>Hemos recibido una solicitud para eliminar definitivamente tu cuenta en nuestra plataforma de alumnos.</p>
            
            <div class="warning-box">
              <p class="warning-title">⚠️ ¡Atención! Esta acción es irreversible</p>
              <p>Al confirmar el borrado, perderás el acceso inmediato a todos los cursos comprados, tu progreso académico y cualquier dato guardado. No será posible recuperar esta información en el futuro.</p>
            </div>

            <p>Para proceder con la eliminación definitiva, haz clic en el siguiente enlace de confirmación:</p>
            
            <div class="btn-container">
              <a href="${confirmLink}" class="btn" target="_blank">Confirmar Eliminación Definitiva</a>
            </div>

            <p>Este enlace es de un solo uso y expirará en 1 hora. Si no has solicitado eliminar tu cuenta, puedes ignorar este mensaje de forma segura y tus datos permanecerán intactos.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Academia de Baile Suárez y Carmen. Todos los derechos reservados.</p>
            <p>Si tienes cualquier duda, contacta con nosotros en <a href="mailto:soporte@suarezycarmenbachata.com">soporte@suarezycarmenbachata.com</a>.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar el correo usando Resend API mediante fetch nativo
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
          subject: 'Confirma la eliminación de tu cuenta - Suárez y Carmen Bachata',
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error('[Delete Account] Resend API error status:', response.status, errBody);
        return res.status(500).json({ error: 'El servicio de correo falló al enviar la confirmación.' });
      }
    } catch (mailError) {
      console.error('[Delete Account] Network error while calling Resend:', mailError.message);
      return res.status(500).json({ error: 'Error de red al enviar el correo de confirmación.' });
    }

    return res.json({ success: true, message: 'Te hemos enviado un correo de confirmación para eliminar tu cuenta.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Confirma el borrado de cuenta definitivo validando el token de confirmación.
 * Ejecuta la eliminación del usuario en auth.users de Supabase.
 */
async function confirmDeleteAccount(req, res, next) {
  try {
    const { token } = req.body;

    if (!token || !isUuid(token)) {
      return res.status(400).json({ error: 'Token de confirmación ausente o con formato incorrecto.' });
    }

    // Buscar el token en la base de datos
    const { data: request, error: fetchError } = await supabase
      .from('account_deletion_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (fetchError || !request) {
      return res.status(400).json({ error: 'El enlace de confirmación no es válido o ya ha sido utilizado.' });
    }

    // Validar expiración
    const now = new Date();
    const expiresAt = new Date(request.expires_at);
    if (expiresAt < now) {
      return res.status(400).json({ error: 'El enlace de confirmación ha expirado. Solicita uno nuevo desde tu perfil.' });
    }

    // Ejecutar el borrado definitivo en Supabase Auth
    // Al eliminar el usuario de auth.users, todas las tablas vinculadas
    // en cascada (profiles, user_courses, user_progress, y la propia account_deletion_tokens)
    // se borrarán automáticamente en la base de datos de PostgreSQL.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(request.user_id);

    if (deleteError) {
      console.error('[Delete Account] Supabase delete user failed:', deleteError.message);
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
