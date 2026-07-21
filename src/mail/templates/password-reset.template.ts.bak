export interface PasswordResetTemplateData {
  name: string;
  code: string;
  expiresInMinutes: number;
}

/**
 * Template HTML del correo de recuperación de contraseña.
 * El logo se referencia mediante cid:logo (adjuntado como inline attachment
 * por MailService desde public/logo.png).
 */
export function buildPasswordResetTemplate(
  data: PasswordResetTemplateData,
): string {
  const { name, code, expiresInMinutes } = data;

  return `
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Recuperación de contraseña</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f2f6f3; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f6f3; padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <tr>
              <td align="center" style="background-color:#1f7a4d; padding: 28px 24px;">
                <img src="cid:logo" alt="EcoGuide" width="72" height="72" style="display:block; border-radius: 8px;" />
                <div style="color:#ffffff; font-size: 20px; font-weight: bold; margin-top: 12px;">EcoGuide</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 32px 8px 32px;">
                <p style="font-size: 16px; color:#1f2a24; margin: 0 0 16px 0;">Hola ${name},</p>
                <p style="font-size: 14px; color:#4b5a52; line-height: 1.6; margin: 0 0 24px 0;">
                  Recibimos una solicitud para restablecer la contraseña de tu cuenta en EcoGuide.
                  Usa el siguiente código para continuar con el proceso:
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 32px 24px 32px;">
                <div style="background-color:#eaf5ee; border: 1px dashed #1f7a4d; border-radius: 10px; padding: 18px 24px; display:inline-block;">
                  <span style="font-size: 30px; letter-spacing: 8px; font-weight: bold; color:#1f7a4d;">${code}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 32px 32px;">
                <p style="font-size: 13px; color:#7c8a82; line-height: 1.6; margin: 0;">
                  Este código expira en ${expiresInMinutes} minutos y solo puede usarse una vez.
                  Si tú no solicitaste este cambio, puedes ignorar este correo con tranquilidad.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f2f6f3; padding: 16px 32px; text-align:center;">
                <span style="font-size: 12px; color:#9aa79f;">EcoGuide Training &middot; El Salvador</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}
