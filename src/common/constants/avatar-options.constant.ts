/**
 * Avatares predefinidos disponibles para el usuario (registro y edición de
 * perfil). Son rutas de assets estáticos servidos por ecoguide-app (no
 * archivos subidos) — cuando exista el módulo UploadFiles, esta whitelist
 * podrá reemplazarse por URLs reales de Cloudflare R2 sin cambiar el shape
 * del campo. Compartida entre RegisterDto y UpdateProfileDto para no
 * duplicar la whitelist.
 */
export const AVATAR_OPTIONS = [
  '/avatars/avatar-boy.png',
  '/avatars/avatar-girl.png',
] as const;
