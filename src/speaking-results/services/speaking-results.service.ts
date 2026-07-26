import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { SpeakingResult } from '@prisma/client';
import { SpeakingResultsRepository } from '../repositories/speaking-results.repository';
import { GroqTranscriptionService } from './groq-transcription.service';
import { StartSpeakingResultDto } from '../dto/start-speaking-result.dto';
import { SpeakingResultResponseDoc } from '../doc/speaking-result-response.doc';
import {
  SPEAKING_RESULT_SORTABLE_FIELDS,
  SpeakingTurnData,
} from '../types/speaking-result.type';
import { ProtectedAreasService } from '../../protected-areas/services/protected-areas.service';
import { SpeakingPracticesService } from '../../speaking-practices/services/speaking-practices.service';
import { AICompletionService } from '../../ai-providers/services/ai-completion.service';
import { AIChatMessage } from '../../ai-providers/strategies/ai-provider.strategy';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { stripHtml } from '../../common/utils/strip-html.util';
import { buildAreaContext } from '../../common/utils/build-area-context.util';
import {
  PaginatedResult,
  parseSort,
} from '../../common/interfaces/paginated-result.interface';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const MIN_SCORE = 1;
const MAX_SCORE = 10;
const DEFAULT_SCORE_ON_PARSE_FAILURE = 5;

/**
 * Contiene toda la lógica de negocio de la práctica de speaking del
 * estudiante: una llamada multi-turno con la IA (mismo patrón que
 * ChatbotConversationsService), donde cada turno del estudiante llega como
 * audio (transcrito vía Groq/Whisper, ver GroqTranscriptionService) y la IA
 * responde conversando en inglés según el prompt de evaluación configurado
 * por el docente (SpeakingPractice.prompt). Al finalizar la llamada se
 * genera retroalimentación + calificación sobre toda la conversación.
 *
 * El estudiante nunca elige el proveedor/modelo — eso ya lo configuró el
 * docente en SpeakingPractice; este servicio solo lo consume.
 */
@Injectable()
export class SpeakingResultsService {
  private readonly logger = new Logger(SpeakingResultsService.name);

  constructor(
    private readonly speakingResultsRepository: SpeakingResultsRepository,
    private readonly groqTranscriptionService: GroqTranscriptionService,
    private readonly protectedAreasService: ProtectedAreasService,
    private readonly speakingPracticesService: SpeakingPracticesService,
    private readonly aiCompletionService: AICompletionService,
  ) {}

  async start(
    dto: StartSpeakingResultDto,
    studentId: string,
    requester: AuthenticatedUser,
  ): Promise<SpeakingResultResponseDoc> {
    const area = await this.protectedAreasService.findByIdOrThrow(
      dto.protectedAreaId,
      requester,
    );

    const practice = await this.speakingPracticesService.findByProtectedArea(
      dto.protectedAreaId,
    );

    if (!practice || !practice.isActive) {
      throw new NotFoundException(
        'Esta área protegida no tiene una práctica de speaking configurada.',
      );
    }

    const openingMessage = await this.generateOpeningMessage(
      practice.providerId,
      practice.model,
      practice.prompt,
      practice.instructions,
      buildAreaContext(area),
    );

    const openingTurn: SpeakingTurnData = {
      id: randomUUID(),
      role: 'assistant',
      message: openingMessage,
      createdAt: new Date(),
    };

    const result = await this.speakingResultsRepository.create({
      studentId,
      protectedAreaId: dto.protectedAreaId,
      speakingPracticeId: practice.id,
      turns: [openingTurn],
    });

    return this.toResponseDoc(result);
  }

  /**
   * Recibe el audio de un turno del estudiante, lo transcribe (Groq/Whisper)
   * y genera la siguiente respuesta de la IA, agregando ambos turnos a la
   * llamada.
   */
  async sendTurn(
    id: string,
    studentId: string,
    requester: AuthenticatedUser,
    audioBuffer: Buffer,
    audioFilename: string,
    audioMimeType: string,
  ): Promise<SpeakingResultResponseDoc> {
    const result = await this.getOwnedResultOrThrow(id, studentId);

    if (result.endedAt) {
      throw new BadRequestException('Esta llamada ya fue finalizada.');
    }

    const practice = await this.getActivePracticeOrThrow(
      result.protectedAreaId,
    );
    const area = await this.protectedAreasService.findByIdOrThrow(
      result.protectedAreaId,
      requester,
    );

    const transcription = await this.groqTranscriptionService.transcribe(
      audioBuffer,
      audioFilename,
      audioMimeType,
    );

    if (!transcription) {
      throw new BadRequestException(
        'No se pudo entender el audio. Intenta hablar de nuevo, más cerca del micrófono.',
      );
    }

    const systemPrompt = this.buildLiveSystemPrompt(
      practice.prompt,
      buildAreaContext(area),
    );
    const history: AIChatMessage[] = result.turns.map((turn) => ({
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      content: turn.message,
    }));

    const messages: AIChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: transcription },
    ];

    const completion = await this.aiCompletionService.complete({
      providerId: practice.providerId,
      model: practice.model,
      messages,
      temperature: 0.6,
      maxTokens: 300,
    });

    const userTurn: SpeakingTurnData = {
      id: randomUUID(),
      role: 'user',
      message: transcription,
      createdAt: new Date(),
    };
    const assistantTurn: SpeakingTurnData = {
      id: randomUUID(),
      role: 'assistant',
      message: completion.content.trim(),
      createdAt: new Date(),
    };

    const updated = await this.speakingResultsRepository.addTurns(id, [
      userTurn,
      assistantTurn,
    ]);

    return this.toResponseDoc(updated);
  }

  async finish(
    id: string,
    studentId: string,
  ): Promise<SpeakingResultResponseDoc> {
    const result = await this.getOwnedResultOrThrow(id, studentId);

    if (result.endedAt) {
      throw new BadRequestException('Esta llamada ya fue finalizada.');
    }

    const { feedback, score } = await this.evaluate(result);

    const updated = await this.speakingResultsRepository.finish(
      id,
      feedback,
      score,
    );

    return this.toResponseDoc(updated);
  }

  async findByArea(
    protectedAreaId: string,
    studentId: string,
    requester: AuthenticatedUser,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<SpeakingResultResponseDoc>> {
    await this.protectedAreasService.findByIdOrThrow(
      protectedAreaId,
      requester,
    );

    return this.paginateByStudentAndArea(studentId, protectedAreaId, query);
  }

  async findByIdOrThrow(
    id: string,
    studentId: string,
  ): Promise<SpeakingResultResponseDoc> {
    const result = await this.getOwnedResultOrThrow(id, studentId);

    return this.toResponseDoc(result);
  }

  /**
   * Variante para el docente de findByArea, para cualquier estudiante — sin
   * el chequeo de visibilidad de STUDENT (el docente puede consultar
   * cualquier área, publicada o no).
   */
  async findByAreaForTeacher(
    protectedAreaId: string,
    studentId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<SpeakingResultResponseDoc>> {
    const areaExists =
      await this.protectedAreasService.existsById(protectedAreaId);

    if (!areaExists) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    return this.paginateByStudentAndArea(studentId, protectedAreaId, query);
  }

  /**
   * Variante para el docente de findByIdOrThrow: detalle (turnos completos)
   * de cualquier llamada, sin el chequeo de pertenencia al estudiante
   * autenticado.
   */
  async findByIdForTeacher(id: string): Promise<SpeakingResultResponseDoc> {
    if (!OBJECT_ID_REGEX.test(id)) {
      throw new BadRequestException('El id proporcionado no es válido.');
    }

    const result = await this.speakingResultsRepository.findById(id);

    if (!result) {
      throw new NotFoundException('Llamada de speaking no encontrada.');
    }

    return this.toResponseDoc(result);
  }

  /**
   * Resumen liviano (sin paginar) usado por StudentProgress para armar el
   * avance del estudiante en un área: cuántas llamadas hizo, cuántas
   * finalizó, y su mejor nota.
   */
  async getSummaryByStudentAndArea(
    protectedAreaId: string,
    studentId: string,
  ): Promise<{ attempts: number; finished: number; bestScore: number | null }> {
    return this.speakingResultsRepository.getSummaryByStudentAndArea(
      studentId,
      protectedAreaId,
    );
  }

  private async paginateByStudentAndArea(
    studentId: string,
    protectedAreaId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<SpeakingResultResponseDoc>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { field: sortField, order: sortOrder } = parseSort(
      query.sort,
      SPEAKING_RESULT_SORTABLE_FIELDS,
      'startedAt',
    );

    const { items, total } =
      await this.speakingResultsRepository.findAllByStudentAndArea(
        studentId,
        protectedAreaId,
        { page, limit, sortField, sortOrder },
      );

    return {
      items: items.map((item) => this.toResponseDoc(item)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private buildLiveSystemPrompt(prompt: string, areaContext: string): string {
    return `${areaContext}\n\n${stripHtml(prompt)}\n\nEstás teniendo una llamada de práctica de speaking en inglés con un estudiante, como si fueras un compañero de conversación real. Responde SIEMPRE en inglés, en 1 a 3 oraciones breves y naturales, y termina casi siempre con una pregunta de seguimiento para que el estudiante siga hablando. No evalúes ni califiques nada todavía — eso ocurre solo al finalizar la llamada.`;
  }

  private async generateOpeningMessage(
    providerId: string,
    model: string,
    prompt: string,
    instructions: string,
    areaContext: string,
  ): Promise<string> {
    const systemPrompt = this.buildLiveSystemPrompt(prompt, areaContext);

    try {
      const completion = await this.aiCompletionService.complete({
        providerId,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Saluda al estudiante en inglés y abre la conversación con tu primera pregunta, relacionada con: "${stripHtml(instructions)}".`,
          },
        ],
        temperature: 0.6,
        maxTokens: 200,
      });

      return completion.content.trim();
    } catch (error) {
      this.logger.warn(
        `No se pudo generar el saludo inicial de la llamada: ${
          error instanceof Error ? error.message : 'error desconocido'
        }`,
      );

      return "Hello! I'm ready when you are. Let's start our conversation — tell me a bit about yourself!";
    }
  }

  /**
   * Llama a la IA con el contexto del área protegida + el prompt de
   * evaluación del docente + la transcripción completa de la llamada,
   * forzando una respuesta en JSON para poder extraer feedback y
   * calificación de forma confiable. Si el modelo no respeta el formato
   * (pasa con cualquier LLM), se degrada con gracia: se usa el texto crudo
   * como feedback y una calificación neutral.
   */
  private async evaluate(
    result: SpeakingResult,
  ): Promise<{ feedback: string; score: number }> {
    const practice = await this.getActivePracticeOrThrow(
      result.protectedAreaId,
    );
    const area = await this.protectedAreasService.existsById(
      result.protectedAreaId,
    );

    if (!area) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    const evaluationPrompt = stripHtml(practice.prompt);
    const transcript = result.turns
      .map(
        (turn) =>
          `${turn.role === 'assistant' ? 'IA' : 'Estudiante'}: ${turn.message}`,
      )
      .join('\n');

    const messages: AIChatMessage[] = [
      {
        role: 'system',
        content: `${evaluationPrompt}\n\nAnaliza la siguiente llamada de práctica de speaking en inglés entre un estudiante y la IA. Evalúa únicamente el desempeño del estudiante en inglés (gramática, vocabulario, fluidez, pronunciación aproximada según lo transcrito). Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código, con exactamente esta forma: {"feedback": "retroalimentación de 2 a 4 oraciones, en español", "score": <número entero del 1 al 10>}.`,
      },
      {
        role: 'user',
        content: `Transcripción de la llamada:\n"""${transcript}"""`,
      },
    ];

    const completionResult = await this.aiCompletionService.complete({
      providerId: practice.providerId,
      model: practice.model,
      messages,
      temperature: 0.4,
      maxTokens: 500,
    });

    return this.parseFeedback(completionResult.content);
  }

  private parseFeedback(content: string): { feedback: string; score: number } {
    const cleaned = content.replace(/```json|```/gi, '').trim();

    try {
      const parsed: unknown = JSON.parse(cleaned);

      if (
        parsed &&
        typeof parsed === 'object' &&
        'feedback' in parsed &&
        'score' in parsed
      ) {
        const feedback = String((parsed as { feedback: unknown }).feedback);
        const rawScore = Number((parsed as { score: unknown }).score);
        const score = Number.isFinite(rawScore)
          ? Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(rawScore)))
          : DEFAULT_SCORE_ON_PARSE_FAILURE;

        return { feedback, score };
      }
    } catch {
      // Cae al fallback de abajo.
    }

    this.logger.warn(
      'No se pudo interpretar la respuesta de la IA como JSON; se usa el texto crudo como feedback.',
    );

    return {
      feedback: content.trim(),
      score: DEFAULT_SCORE_ON_PARSE_FAILURE,
    };
  }

  private async getActivePracticeOrThrow(protectedAreaId: string) {
    const practice =
      await this.speakingPracticesService.findByProtectedArea(protectedAreaId);

    if (!practice || !practice.isActive) {
      throw new BadRequestException(
        'La práctica de speaking de esta área ya no está disponible.',
      );
    }

    return practice;
  }

  private async getOwnedResultOrThrow(
    id: string,
    studentId: string,
  ): Promise<SpeakingResult> {
    if (!OBJECT_ID_REGEX.test(id)) {
      throw new BadRequestException('El id proporcionado no es válido.');
    }

    const result = await this.speakingResultsRepository.findById(id);

    if (!result) {
      throw new NotFoundException('Llamada de speaking no encontrada.');
    }

    if (result.studentId !== studentId) {
      throw new ForbiddenException('No tienes acceso a esta llamada.');
    }

    return result;
  }

  private toResponseDoc(result: SpeakingResult): SpeakingResultResponseDoc {
    return plainToInstance(SpeakingResultResponseDoc, result, {
      excludeExtraneousValues: true,
    });
  }
}
