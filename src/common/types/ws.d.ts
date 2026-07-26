/**
 * Tipos mínimos para el paquete `ws` (cliente WebSocket), usado únicamente
 * por EdgeTtsService para hablar el protocolo no oficial de Microsoft Edge
 * Read Aloud (voces neuronales). No se pudo instalar `@types/ws` en este
 * entorno de sandbox (mismo error EPERM/ENOTEMPTY de siempre al limpiar
 * paquetes de node_modules) — es seguro instalarlo (`npm i -D @types/ws`) en
 * tu máquina más adelante y borrar este archivo, pero mientras tanto esta
 * declaración mínima evita `any` y mantiene el código tipado (ver
 * speech-recognition.d.ts en el frontend, mismo patrón para una API externa
 * sin tipos oficiales disponibles).
 */
declare module 'ws' {
  import { EventEmitter } from 'events';

  interface ClientOptions {
    headers?: Record<string, string>;
  }

  interface IncomingMessageLike {
    statusCode?: number;
  }

  class WebSocket extends EventEmitter {
    constructor(address: string, options?: ClientOptions);

    send(data: string): void;
    close(): void;

    on(event: 'open', listener: () => void): this;
    on(
      event: 'message',
      listener: (data: Buffer, isBinary: boolean) => void,
    ): this;
    on(event: 'close', listener: (code: number, reason: Buffer) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(
      event: 'unexpected-response',
      listener: (request: unknown, response: IncomingMessageLike) => void,
    ): this;
  }

  export default WebSocket;
}
