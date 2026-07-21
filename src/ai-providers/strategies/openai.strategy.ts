import { Injectable } from '@nestjs/common';
import { OpenAICompatibleStrategy } from './openai-compatible.strategy';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

/** Estrategia para OpenAI (API nativa, formato chat/completions). */
@Injectable()
export class OpenAIStrategy extends OpenAICompatibleStrategy {
  constructor() {
    super(OPENAI_BASE_URL);
  }
}
