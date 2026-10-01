import { Injectable } from '@nestjs/common';
import { OpenAICompatibleStrategy } from './openai-compatible.strategy';
import { AICompletionParams } from './ai-provider.strategy';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

/**
 * Familias de modelos de razonamiento de OpenAI: la serie `o` (o1, o3,
 * o4…), GPT-5 y GPT-6 (Astra, Sol, Luna). Se excluyen las variantes
 * `-chat`, que son modelos conversacionales normales y sí aceptan los
 * parámetros clásicos.
 */
const REASONING_MODEL_PATTERN = /^(o\d|gpt-5|gpt-6)/i;
const NON_REASONING_VARIANT_PATTERN = /-chat/i;

/**
 * Esfuerzo de razonamiento por defecto. Se manda explícito en vez de dejar
 * el del modelo porque EcoGuide son conversaciones de aula: interesa que la
 * respuesta llegue rápido y barata, no que el modelo piense de más. `low`
 * es el valor más bajo aceptado por los tres modelos GPT-6 (`none` y
 * `minimal` los rechaza Astra).
 */
const DEFAULT_REASONING_EFFORT = 'low';

/**
 * Presupuesto extra de tokens para el razonamiento. En estos modelos el
 * límite de la petición cubre TANTO los tokens de razonamiento (que se
 * consumen primero) como la respuesta visible, así que mandar tal cual el
 * límite pensado para la respuesta (300 en un turno de speaking, por
 * ejemplo) devolvería contenido vacío con finish_reason "length".
 */
const REASONING_TOKEN_BUDGET = 2000;

/** Estrategia para OpenAI (API nativa, formato chat/completions). */
@Injectable()
export class OpenAIStrategy extends OpenAICompatibleStrategy {
  constructor() {
    super(OPENAI_BASE_URL);
  }

  /**
   * Los modelos de razonamiento de OpenAI rechazan el cuerpo clásico:
   * `temperature`/`top_p` no admiten valores personalizados y `max_tokens`
   * fue reemplazado por `max_completion_tokens`. Mandarlos devuelve 400, así
   * que para esos modelos se arma un cuerpo distinto. El resto de modelos
   * (gpt-4o y anteriores) siguen usando el de la clase base.
   */
  protected override buildRequestBody(
    params: AICompletionParams,
  ): Record<string, unknown> {
    if (!OpenAIStrategy.isReasoningModel(params.model)) {
      return super.buildRequestBody(params);
    }

    return {
      model: params.model,
      messages: params.messages,
      reasoning_effort: DEFAULT_REASONING_EFFORT,
      ...(params.maxTokens !== undefined && {
        max_completion_tokens: params.maxTokens + REASONING_TOKEN_BUDGET,
      }),
    };
  }

  private static isReasoningModel(model: string): boolean {
    return (
      REASONING_MODEL_PATTERN.test(model) &&
      !NON_REASONING_VARIANT_PATTERN.test(model)
    );
  }
}
