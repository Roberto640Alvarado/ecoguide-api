# Assets públicos

Coloca aquí el logo de EcoGuide con el nombre exacto:

```
public/logo.png
```

El servicio de correo (`src/mail/services/mail.service.ts`) lo adjunta automáticamente
como imagen embebida (`cid:logo`) en el template de recuperación de contraseña
(`src/mail/templates/password-reset.template.ts`).

Si el archivo no existe, el correo se envía igual pero sin el logo (no falla el envío).

Recomendado: PNG cuadrado, fondo transparente o blanco, ~256x256px.
