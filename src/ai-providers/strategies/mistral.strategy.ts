import { Injectable } from '@nestjs/common';
import { OpenAICompatibleStrategy } from './openai-compatible.strategy';

const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';

/** Estrategia para Mistral (API compatible con el formato chat/completions de OpenAI). */
@Injectable()
export class MistralStrategy extends OpenAICompatibleStrategy {
  constructor() {
    super(MISTRAL_BASE_URL);
  }
}
