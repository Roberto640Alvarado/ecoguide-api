import { InternalServerErrorException } from '@nestjs/common';
import { GeminiStrategy } from '../strategies/gemini.strategy';

describe('GeminiStrategy', () => {
  let strategy: GeminiStrategy;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    strategy = new GeminiStrategy();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('extrae los mensajes "system" a systemInstruction y traduce assistant -> model', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => ({
        candidates: [
          {
            content: { parts: [{ text: 'Hola, ¿cómo estás?' }] },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15,
        },
      }),
    });

    const result = await strategy.complete({
      apiKey: 'gemini-key',
      model: 'gemini-1.5-flash',
      messages: [
        { role: 'system', content: 'Eres un guía turístico.' },
        { role: 'user', content: 'Hola' },
        { role: 'assistant', content: 'Anteriormente dije esto' },
      ],
      temperature: 0.4,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('models/gemini-1.5-flash:generateContent');
    expect(url).toContain('key=gemini-key');

    const body = JSON.parse(init.body as string);
    expect(body.systemInstruction).toEqual({
      parts: [{ text: 'Eres un guía turístico.' }],
    });
    expect(body.contents).toEqual([
      { role: 'user', parts: [{ text: 'Hola' }] },
      { role: 'model', parts: [{ text: 'Anteriormente dije esto' }] },
    ]);
    expect(body.generationConfig.temperature).toBe(0.4);

    expect(result.content).toBe('Hola, ¿cómo estás?');
    expect(result.finishReason).toBe('STOP');
    expect(result.usage).toEqual({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });
  });

  it('lanza InternalServerErrorException si Gemini responde con error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => ({ error: { message: 'API key inválida' } }),
    });

    await expect(
      strategy.complete({
        apiKey: 'bad-key',
        model: 'gemini-1.5-flash',
        messages: [{ role: 'user', content: 'Hola' }],
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('envuelve errores de red en InternalServerErrorException', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(
      strategy.complete({
        apiKey: 'gemini-key',
        model: 'gemini-1.5-flash',
        messages: [{ role: 'user', content: 'Hola' }],
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
