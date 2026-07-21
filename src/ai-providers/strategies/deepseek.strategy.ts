import { Injectable } from '@nestjs/common';
import { OpenAICompatibleStrategy } from './openai-compatible.strategy';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

/** Estrategia para DeepSeek (API compatible con el formato chat/completions de OpenAI). */
@Injectable()
export class DeepSeekStrategy extends OpenAICompatibleStrategy {
  constructor() {
    super(DEEPSEEK_BASE_URL);
  }
}
