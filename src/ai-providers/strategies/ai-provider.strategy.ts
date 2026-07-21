export type AIChatRole = 'system' | 'user' | 'assistant';

export interface AIChatMessage {
  role: AIChatRole;
  content: string;
}

export interface AICompletionParams {
  /** API key en texto plano (ya descifrada por AICompletionService). */
  apiKey: string;
  /** Identificador real del modelo tal como lo espera el vendor (ej. "gemini-1.5-flash", "claude-3-5-sonnet-20241022"). */
  model: string;
  messages: AIChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface AICompletionUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface AICompletionResult {
  content: string;
  finishReason?: string;
  usage?: AICompletionUsage;
}

/**
 * Contrato común (Strategy pattern) que implementa cada proveedor de IA
 * soportado (Gemini, Claude, OpenAI, Mistral, DeepSeek). AICompletionService
 * es el único consumidor de esta interfaz: resuelve la estrategia correcta
 * según AIProvider.providerType (ver AIProviderStrategyFactory) y le delega
 * la llamada real al proveedor — Chatbot y SpeakingPractices nunca conocen
 * los detalles de cada API, solo hablan este contrato genérico.
 *
 * Agregar un proveedor nuevo (ej. Cohere) significa: una clase que
 * implemente esta interfaz + registrarla en AIProviderStrategyFactory. No
 * hay que tocar AICompletionService ni ningún consumidor existente.
 */
export interface AIProviderStrategy {
  complete(params: AICompletionParams): Promise<AICompletionResult>;
}
