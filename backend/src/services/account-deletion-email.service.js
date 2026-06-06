function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildAccountDeletionEmail({ confirmLink, year = new Date().getFullYear() }) {
  const safeConfirmLink = escapeHtml(confirmLink);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirma la eliminación de tu cuenta</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;color:#f5f5f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">Confirma la eliminación definitiva de tu cuenta.</div>
  <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="padding:24px 12px">
    <tbody>
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="max-width:620px;margin:0 auto;background-color:#171717;border:1px solid #262626;border-radius:18px;overflow:hidden">
            <tbody>
              <tr>
                <td style="padding:26px 28px 10px;border-bottom:1px solid #262626">
                  <div style="font-size:22px;font-weight:800;letter-spacing:0.02em;color:#ffffff">Suárez y Carmen</div>
                  <div style="margin-top:4px;color:#a3a3a3;font-size:13px">Academia online</div>
                </td>
              </tr>
              <tr>
                <td style="padding:26px 28px 10px">
                  <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:34px">Confirma la eliminación de tu cuenta</h1>
                  <p style="margin:14px 0 0;color:#a3a3a3;font-size:15px;line-height:24px">Hemos recibido una solicitud para eliminar tu cuenta de alumno.</p>
                  <p style="margin:14px 0 0;color:#a3a3a3;font-size:15px;line-height:24px">Antes de aplicar el cambio, necesitamos que confirmes esta acción desde el siguiente enlace.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 28px 0">
                  <div style="border:1px solid rgba(220,38,38,0.35);background-color:rgba(220,38,38,0.08);border-radius:14px;padding:16px 18px">
                    <div style="color:#fecaca;font-size:14px;font-weight:700;line-height:20px">Esta acción no se puede deshacer.</div>
                    <div style="margin-top:6px;color:#d4d4d4;font-size:13px;line-height:21px">Se eliminarán tu perfil, tus compras, tu progreso y los datos asociados a tu cuenta.</div>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:22px 28px 0">
                  <a href="${safeConfirmLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px">Confirmar eliminación</a>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 28px 26px">
                  <p style="margin:0;color:#a3a3a3;font-size:13px;line-height:21px">El enlace caduca en 1 hora. Si no has solicitado este cambio, puedes ignorar este correo y tu cuenta seguirá activa.</p>
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid #262626;padding:16px 28px 20px;color:#737373;font-size:12px;line-height:18px">
                  <div>Academia Suárez y Carmen</div>
                  <div>Soporte: academy@mail.suarezycarmenbachata.com</div>
                  <div style="margin-top:8px">&copy; ${year} Suárez y Carmen. Todos los derechos reservados.</div>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}

module.exports = {
  buildAccountDeletionEmail,
};
