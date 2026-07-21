const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/**
 * Extrae el texto plano de un HTML generado por RichTextEditor (Tiptap) en
 * el frontend. Los campos de prompt/instrucciones (SpeakingPractice.prompt,
 * ChatbotConfig.systemPrompt/welcomeMessage) se guardan como HTML — antes de
 * mandarlos a un AIProvider real hay que convertirlos a texto plano, para no
 * ensuciar el prompt con etiquetas.
 *
 * Usa siempre regex (no hay DOM disponible en el servidor).
 */
export function stripHtml(html: string): string {
  const withoutTags = html.replace(/<[^>]*>/g, ' ');
  const withDecodedEntities = withoutTags.replace(
    /&(amp|lt|gt|quot|#39|nbsp);/g,
    (match) => HTML_ENTITIES[match] ?? match,
  );

  return withDecodedEntities.replace(/\s+/g, ' ').trim();
}
