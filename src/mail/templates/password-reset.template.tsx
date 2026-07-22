import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export interface PasswordResetTemplateData {
  name: string;
  code: string;
  expiresInMinutes: number;
  /**
   * Logo embebido como data URI (data:image/png;base64,...), construido por
   * MailService a partir de public/logo.png. Se usa un data URI en vez de
   * un adjunto inline con cid: para no depender de si el proveedor de
   * correo (Brevo, en este caso) soporta esa referencia — un data URI se
   * renderiza igual en cualquier proveedor. Si no se provee, el correo se
   * envía sin logo (el nombre "EcoGuide" igual se muestra).
   */
  logoSrc?: string;
}

/**
 * Template del correo de recuperación de contraseña, construido con
 * react-email (renderizado a HTML vía @react-email/render en MailService).
 */
export function PasswordResetEmail({
  name,
  code,
  expiresInMinutes,
  logoSrc,
}: PasswordResetTemplateData) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Tu código de recuperación de EcoGuide: {code}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            {logoSrc && (
              <Img
                src={logoSrc}
                width={72}
                height={72}
                alt="EcoGuide"
                style={styles.logo}
              />
            )}
            <Text style={styles.brand}>EcoGuide</Text>
          </Section>

          <Section style={styles.content}>
            <Text style={styles.greeting}>Hola {name},</Text>
            <Text style={styles.paragraph}>
              Recibimos una solicitud para restablecer la contraseña de tu
              cuenta en EcoGuide. Usa el siguiente código para continuar con
              el proceso:
            </Text>
          </Section>

          <Section style={styles.codeWrapper}>
            <Text style={styles.codeText}>{code}</Text>
          </Section>

          <Section style={styles.content}>
            <Text style={styles.footerNote}>
              Este código expira en {expiresInMinutes} minutos y solo puede
              usarse una vez. Si tú no solicitaste este cambio, puedes ignorar
              este correo con tranquilidad.
            </Text>
          </Section>

          <Hr style={styles.hr} />
          <Text style={styles.footer}>EcoGuide Training · El Salvador</Text>
        </Container>
      </Body>
    </Html>
  );
}

const styles = {
  main: {
    backgroundColor: '#f2f6f3',
    fontFamily: 'Arial, Helvetica, sans-serif',
    padding: '32px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    maxWidth: '480px',
    margin: '0 auto',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  header: {
    backgroundColor: '#1f7a4d',
    padding: '28px 24px',
    textAlign: 'center' as const,
  },
  logo: {
    display: 'block',
    borderRadius: '8px',
    margin: '0 auto',
  },
  brand: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: 'bold',
    marginTop: '12px',
    marginBottom: 0,
  },
  content: {
    padding: '0 32px',
  },
  greeting: {
    fontSize: '16px',
    color: '#1f2a24',
    marginBottom: '16px',
  },
  paragraph: {
    fontSize: '14px',
    color: '#4b5a52',
    lineHeight: '1.6',
  },
  codeWrapper: {
    textAlign: 'center' as const,
    padding: '8px 32px 24px',
  },
  codeText: {
    backgroundColor: '#eaf5ee',
    border: '1px dashed #1f7a4d',
    borderRadius: '10px',
    display: 'inline-block',
    padding: '18px 24px',
    fontSize: '30px',
    letterSpacing: '8px',
    fontWeight: 'bold',
    color: '#1f7a4d',
    margin: 0,
  },
  footerNote: {
    fontSize: '13px',
    color: '#7c8a82',
    lineHeight: '1.6',
  },
  hr: {
    borderColor: '#e5e9e6',
    margin: '8px 32px',
  },
  footer: {
    fontSize: '12px',
    color: '#9aa79f',
    textAlign: 'center' as const,
    padding: '16px 32px 24px',
  },
};
