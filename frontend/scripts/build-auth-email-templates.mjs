import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRAND = {
  appName: 'Academia Suárez y Carmen',
  supportEmail: 'academy@mail.suarezycarmenbachata.com',
  primary: '#dc2626',
  bg: '#09090b',
  card: '#171717',
  text: '#f5f5f5',
  muted: '#a3a3a3',
};

function Shell({ preheader, title, intro, ctaText, ctaHref, outro }) {
  return React.createElement(
    'html',
    { lang: 'es' },
    React.createElement(
      'head',
      null,
      React.createElement('meta', { charSet: 'UTF-8' })
    ),
    React.createElement(
      'body',
      {
        style: {
          margin: 0,
          padding: 0,
          backgroundColor: BRAND.bg,
          color: BRAND.text,
          fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        },
      },
      React.createElement(
        'div',
        { style: { display: 'none', maxHeight: 0, overflow: 'hidden', opacity: 0 } },
        preheader
      ),
      React.createElement(
        'table',
        {
          role: 'presentation',
          width: '100%',
          cellPadding: 0,
          cellSpacing: 0,
          style: { padding: '24px 12px' },
        },
        React.createElement(
          'tbody',
          null,
          React.createElement(
            'tr',
            null,
            React.createElement(
              'td',
              { align: 'center' },
              React.createElement(
                'table',
                {
                  role: 'presentation',
                  width: '100%',
                  cellPadding: 0,
                  cellSpacing: 0,
                  style: {
                    maxWidth: '620px',
                    margin: '0 auto',
                    backgroundColor: BRAND.card,
                    border: '1px solid #262626',
                    borderRadius: '18px',
                    overflow: 'hidden',
                  },
                },
                React.createElement(
                  'tbody',
                  null,
                  React.createElement(
                    'tr',
                    null,
                    React.createElement(
                      'td',
                      {
                        style: {
                          padding: '26px 28px 10px',
                          borderBottom: '1px solid #262626',
                        },
                      },
                      React.createElement(
                        'div',
                        { style: { fontSize: '22px', fontWeight: 800, letterSpacing: '0.02em' } },
                        'Suárez y Carmen'
                      ),
                      React.createElement(
                        'div',
                        { style: { marginTop: '4px', color: BRAND.muted, fontSize: '13px' } },
                        BRAND.appName
                      )
                    )
                  ),
                  React.createElement(
                    'tr',
                    null,
                    React.createElement(
                      'td',
                      { style: { padding: '26px 28px 10px' } },
                      React.createElement('h1', { style: { margin: 0, fontSize: '28px', lineHeight: '34px' } }, title),
                      React.createElement('p', {
                        style: {
                          margin: '14px 0 0',
                          color: BRAND.muted,
                          fontSize: '15px',
                          lineHeight: '24px',
                          whiteSpace: 'pre-line',
                        },
                      }, intro)
                    )
                  ),
                  ctaHref && ctaText
                    ? React.createElement(
                        'tr',
                        null,
                        React.createElement(
                          'td',
                          { style: { padding: '18px 28px 0' } },
                          React.createElement(
                            'a',
                            {
                              href: ctaHref,
                              target: '_blank',
                              rel: 'noopener noreferrer',
                              style: {
                                display: 'inline-block',
                                backgroundColor: BRAND.primary,
                                color: '#ffffff',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '15px',
                                padding: '12px 22px',
                                borderRadius: '999px',
                              },
                            },
                            ctaText
                          )
                        )
                      )
                    : null,
                  React.createElement(
                    'tr',
                    null,
                    React.createElement(
                      'td',
                      { style: { padding: '18px 28px 26px' } },
                      React.createElement('p', {
                        style: {
                          margin: 0,
                          color: BRAND.muted,
                          fontSize: '13px',
                          lineHeight: '21px',
                          whiteSpace: 'pre-line',
                        },
                      }, outro)
                    )
                  ),
                  React.createElement(
                    'tr',
                    null,
                    React.createElement(
                      'td',
                      {
                        style: {
                          borderTop: '1px solid #262626',
                          padding: '16px 28px 20px',
                          color: '#737373',
                          fontSize: '12px',
                          lineHeight: '18px',
                        },
                      },
                      React.createElement('div', null, `${BRAND.appName}`),
                      React.createElement('div', null, `Soporte: ${BRAND.supportEmail}`)
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  );
}

function renderDocument(component) {
  return encodeNonAsciiHtml(`<!doctype html>${renderToStaticMarkup(component)}`);
}

function encodeNonAsciiHtml(content) {
  return content.replace(/[^\x00-\x7F]/g, (character) => `&#${character.codePointAt(0)};`);
}

function normalizeTemplateContent(content) {
  return content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

const templates = [
  {
    output: 'confirm-signup.html',
    component: React.createElement(Shell, {
      preheader: 'Confirma tu cuenta para empezar en la academia.',
      title: 'Confirma tu cuenta',
      intro:
        'Gracias por unirte a la Academia Suárez y Carmen.\n\nPara activar tu cuenta y acceder a tus cursos, confirma tu correo con el botón de abajo.',
      ctaText: 'Confirmar mi cuenta',
      ctaHref: '{{ .ConfirmationURL }}',
      outro:
        'Si no has creado esta cuenta, puedes ignorar este correo.\n\nPor seguridad, este enlace puede caducar.',
    }),
  },
  {
    output: 'recover-password.html',
    component: React.createElement(Shell, {
      preheader: 'Recupera el acceso a tu cuenta de forma segura.',
      title: 'Recupera tu contraseña',
      intro:
        'Hemos recibido una solicitud para restablecer tu contraseña.\n\nHaz clic en el botón para crear una nueva contraseña de forma segura.',
      ctaText: 'Restablecer contraseña',
      ctaHref: '{{ .ConfirmationURL }}',
      outro:
        'Si no solicitaste este cambio, no es necesario hacer nada. Tu contraseña actual seguirá siendo válida.',
    }),
  },
  {
    output: 'password-changed.html',
    component: React.createElement(Shell, {
      preheader: 'Tu contraseña se ha actualizado correctamente.',
      title: 'Contraseña actualizada',
      intro:
        'Te confirmamos que la contraseña de tu cuenta se ha cambiado correctamente.',
      outro:
        'Si has realizado este cambio, no tienes que hacer nada más.\n\nSi no reconoces esta actividad, solicita una recuperación de contraseña desde la web y contacta con soporte.',
    }),
  },
];

const outputDir = path.resolve(__dirname, '..', '..', 'supabase', 'templates');
mkdirSync(outputDir, { recursive: true });

for (const template of templates) {
  const outputPath = path.join(outputDir, template.output);
  const renderedTemplate = renderDocument(template.component);

  if (
    existsSync(outputPath) &&
    normalizeTemplateContent(readFileSync(outputPath, 'utf8')) === normalizeTemplateContent(renderedTemplate)
  ) {
    console.log(`Unchanged ${outputPath}`);
    continue;
  }

  writeFileSync(outputPath, renderedTemplate, 'utf8');
  console.log(`Generated ${outputPath}`);
}
