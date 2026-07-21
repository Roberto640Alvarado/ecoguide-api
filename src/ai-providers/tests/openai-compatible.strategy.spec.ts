import { InternalServerErrorException } from '@nestjs/common';
import { OpenAIStrategy } from '../strategies/openai.strategy';
import { MistralStrategy } from '../strategies/mistral.strategy';
import { DeepSeekStrategy } from '../strategies/deepseek.strategy';

/**
 * OpenAIStrategy, MistralStrategy y DeepSeekStrategy comparten toda su
 * lógica vía OpenAICompatibleStrategy (solo difieren en baseUrl), así que
 * probar el request/response con una alcanza para las tres; el segundo test
 * confirma que efectivamente pegan a baseUrls distintas.
 */
describe('OpenAICompatibleStrategy (vía OpenAIStrategy)', () => {
  let strategy: OpenAIStrategy;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    strategy = new OpenAIStrategy();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('envía messages tal cual (incluyendo el rol system) en formato chat/completions', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => ({
        choices: [{ message: { content: '¡Hola!' }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 4,
          total_tokens: 14,
        },
      }),
    });

    const result = await strategy.complete({
      apiKey: 'sk-openai',
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Eres un guía turístico.' },
        { role: 'user', content: 'Hola' },
      ],
      temperature: 0.7,
      maxTokens: 300,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-openai');

    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages).toEqual([
      { role: 'system', content: 'Eres un guía turístico.' },
      { role: 'user', content: 'Hola' },
    ]);
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(300);

    expect(result.content).toBe('¡Hola!');
    expect(result.finishReason).toBe('stop');
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 4,
      totalTokens: 14,
    });
  });

  it('lanza InternalServerErrorException si el proveedor responde con error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => ({ error: { message: 'boom' } }),
    });

    await expect(
      strategy.complete({
        apiKey: 'sk-openai',
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hola' }],
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('Mistral y DeepSeek pegan a su propia baseUrl', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => ({ choices: [{ message: { content: 'ok' } }] }),
    });

    await new MistralStrategy().complete({
      apiKey: 'k',
      model: 'mistral-large-latest',
      messages: [{ role: 'user', content: 'hola' }],
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.mistral.ai/v1/chat/completions',
    );

    await new DeepSeekStrategy().complete({
      apiKey: 'k',
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: 'hola' }],
    });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://api.deepseek.com/v1/chat/completions',
    );
  });
});
