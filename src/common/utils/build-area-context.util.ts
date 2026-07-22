import { stripHtml } from './strip-html.util';

interface AreaContextInput {
  name: string;
  description: string;
}

/**
 * Bloque de contexto del área protegida que se antepone a los prompts de IA
 * (SpeakingPractice.prompt y ChatbotConfig.systemPrompt) para que el modelo
 * siempre sepa de qué área protegida se trata, sin que el docente tenga que
 * repetir el nombre/descripción manualmente en cada prompt que escribe.
 */
export function buildAreaContext(area: AreaContextInput): string {
  return `Área protegida: ${area.name}\nDescripción: ${stripHtml(area.description)}`;
}
