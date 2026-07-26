import { Injectable } from '@nestjs/common';
import { OpenAICompatibleStrategy } from './openai-compatible.strategy';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/** Estrategia para Groq (API compatible con el formato chat/completions de OpenAI). */
@Injectable()
export class GroqStrategy extends OpenAICompatibleStrategy {
  constructor() {
    super(GROQ_BASE_URL);
  }
}
