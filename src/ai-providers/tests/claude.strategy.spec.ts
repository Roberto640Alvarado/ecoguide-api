import { InternalServerErrorException } from '@nestjs/common';
import { ClaudeStrategy } from '../strategies/claude.strategy';

describe('ClaudeStrategy', () => {
  let strategy: ClaudeStrategy;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    strategy = new ClaudeStrategy();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('extrae los mensajes "system" al campo system y aplica max_tokens por defecto', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => ({
        content: [{ type: 'text', text: '¡Hola!' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 12, output_tokens: 8 },
      }),
    });

    const result = await strategy.complete({
      apiKey: 'claude-key',
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: 'Eres un guía turístico.' },
        { role: 'user', content: 'Hola' },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('claude-key');
    expect(init.headers['anthropic-version']).toBe('2023-06-01');

    const body = JSON.parse(init.body as string);
    expect(body.system).toBe('Eres un guía turístico.');
    expect(body.messages).toEqual([{ role: 'user', content: 'Hola' }]);
    expect(body.max_tokens).toBe(1024);

    expect(result.content).toBe('¡Hola!');
    expect(result.finishReason).toBe('end_turn');
    expect(result.usage).toEqual({
      promptTokens: 12,
      completionTokens: 8,
      totalTokens: 20,
    });
  });

  it('respeta maxTokens explícito en vez del valor por defecto', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => ({
        content: [{ type: 'text', text: 'ok' }],
        usage: {},
      }),
    });

    await strategy.complete({
      apiKey: 'claude-key',
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: 'Hola' }],
      maxTokens: 512,
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.max_tokens).toBe(512);
  });

  it('lanza InternalServerErrorException si Claude responde con error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => ({ error: { message: 'API key inválida' } }),
    });

    await expect(
      strategy.complete({
        apiKey: 'bad-key',
        model: 'claude-3-5-sonnet-20241022',
        messages: [{ role: 'user', content: 'Hola' }],
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
