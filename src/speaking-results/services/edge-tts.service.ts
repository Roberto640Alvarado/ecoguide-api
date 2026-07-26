import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import WebSocket from 'ws';

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WSS_URL =
  'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
// Versión de Edge "de mentira" usada únicamente para armar el header
// Sec-MS-GEC/User-Agent que el servicio espera ver — no se valida contra una
// build real, solo debe parecer una versión reciente.
const EDGE_VERSION = '140.0.3485.14';
const DEFAULT_VOICE = 'en-US-AriaNeural';
const SYNTHESIS_TIMEOUT_MS = 15_000;

/**
 * Genera audio (voz neuronal) a partir de texto usando el mismo servicio que
 * usa la función "Leer en voz alta" de Microsoft Edge — no existe una API
 * pública/oficial para esto, así que se habla directamente el protocolo
 * WebSocket no documentado que usa el navegador (ver comentario de
 * synthesize() con más detalle). Es gratis y sin límite de uso conocido,
 * pero al no ser una integración oficial de Microsoft podría dejar de
 * funcionar sin aviso si cambian el protocolo — si eso pasa, la app debe
 * volver a `speechSynthesis` del navegador como respaldo.
 *
 * No requiere ninguna API key: el "TrustedClientToken" de abajo es un valor
 * público y fijo, reutilizado por cualquier cliente de Edge (es el mismo
 * para todos, no identifica a este proyecto ni a ningún usuario).
 */
@Injectable()
export class EdgeTtsService {
  private readonly logger = new Logger(EdgeTtsService.name);

  /** Sintetiza `text` y devuelve el audio completo en MP3 (24kHz, mono, 48kbps). */
  synthesize(text: string, voice: string = DEFAULT_VOICE): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const connectionId = randomUUID().replace(/-/g, '');
      const url =
        `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
        `&Sec-MS-GEC=${this.buildSecMsGec()}` +
        `&Sec-MS-GEC-Version=1-${EDGE_VERSION}` +
        `&ConnectionId=${connectionId}`;

      const ws = new WebSocket(url, {
        headers: { 'User-Agent': this.buildUserAgent() },
      });

      const audioParts: Buffer[] = [];
      let settled = false;

      const timeoutHandle = setTimeout(() => {
        fail('Tiempo de espera agotado generando el audio de la IA.');
      }, SYNTHESIS_TIMEOUT_MS);

      const fail = (logMessage: string) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutHandle);
        this.logger.error(logMessage);
        ws.close();
        reject(
          new InternalServerErrorException(
            'No se pudo generar el audio de la IA.',
          ),
        );
      };

      ws.on('open', () => {
        ws.send(this.buildSpeechConfigMessage());
        ws.send(this.buildSsmlMessage(text, voice));
      });

      ws.on('message', (data, isBinary) => {
        if (isBinary) {
          // Cada frame binario trae un pequeño header de texto pegado al
          // inicio; los primeros 2 bytes (big-endian) indican cuánto mide
          // ese header, y el audio real empieza justo después.
          const headerLength = data.readUInt16BE(0);
          audioParts.push(data.subarray(2 + headerLength));
          return;
        }

        if (data.toString().includes('Path:turn.end')) {
          settled = true;
          clearTimeout(timeoutHandle);
          ws.close();
          resolve(Buffer.concat(audioParts));
        }
      });

      ws.on('unexpected-response', (_request, response) => {
        fail(
          `Edge TTS respondió con estado ${response.statusCode ?? 'desconocido'}.`,
        );
      });

      ws.on('error', (error) => {
        fail(`Fallo al comunicarse con Edge TTS: ${error.message}`);
      });
    });
  }

  /**
   * Microsoft exige este header (junto con Sec-MS-GEC-Version) desde que
   * endurecieron el acceso al servicio de "Leer en voz alta": es un hash
   * SHA-256 del token público de arriba concatenado con la hora actual en
   * ticks de Windows (100ns desde 1601-01-01), redondeada hacia abajo al
   * bloque de 5 minutos vigente. No identifica nada del cliente — es el
   * mismo algoritmo para cualquiera que hable este protocolo.
   */
  private buildSecMsGec(): string {
    const WINDOWS_EPOCH_OFFSET_SECONDS = 11_644_473_600n;
    const SECONDS_TO_100NS = 10_000_000n;
    const FIVE_MINUTES_IN_SECONDS = 300n;

    let ticks =
      BigInt(Math.floor(Date.now() / 1000)) + WINDOWS_EPOCH_OFFSET_SECONDS;
    ticks -= ticks % FIVE_MINUTES_IN_SECONDS;
    ticks *= SECONDS_TO_100NS;

    return createHash('sha256')
      .update(`${ticks.toString()}${TRUSTED_CLIENT_TOKEN}`, 'ascii')
      .digest('hex')
      .toUpperCase();
  }

  private buildUserAgent(): string {
    const chromeMajor = EDGE_VERSION.split('.')[0];

    return (
      `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
      `(KHTML, like Gecko) Chrome/${chromeMajor}.0.0.0 Safari/537.36 ` +
      `Edg/${EDGE_VERSION}`
    );
  }

  private buildSpeechConfigMessage(): string {
    const payload = {
      context: {
        synthesis: {
          audio: {
            metadataoptions: {
              sentenceBoundaryEnabled: 'false',
              wordBoundaryEnabled: 'false',
            },
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
          },
        },
      },
    };

    return (
      `X-Timestamp:${this.timestamp()}\r\n` +
      `Content-Type:application/json; charset=utf-8\r\n` +
      `Path:speech.config\r\n\r\n${JSON.stringify(payload)}`
    );
  }

  private buildSsmlMessage(text: string, voice: string): string {
    const ssml =
      `<speak version='1.0' xml:lang='en-US'>` +
      `<voice name='${voice}'>` +
      `<prosody pitch='+0Hz' rate='+0%' volume='+0%'>${this.escapeForSsml(text)}</prosody>` +
      `</voice></speak>`;

    return (
      `X-RequestId:${randomUUID().replace(/-/g, '')}\r\n` +
      `Content-Type:application/ssml+xml\r\n` +
      `X-Timestamp:${this.timestamp()}\r\n` +
      `Path:ssml\r\n\r\n${ssml}`
    );
  }

  private escapeForSsml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private timestamp(): string {
    return new Date()
      .toUTCString()
      .replace('GMT', 'GMT+0000 (Coordinated Universal Time)');
  }
}
