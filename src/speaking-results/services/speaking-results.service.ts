import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { SpeakingResult } from '@prisma/client';
import { SpeakingResultsRepository } from '../repositories/speaking-results.repository';
import { CreateSpeakingResultDto } from '../dto/create-speaking-result.dto';
import { SpeakingResultResponseDoc } from '../doc/speaking-result-response.doc';
import { SPEAKING_RESULT_SORTABLE_FIELDS } from '../types/speaking-result.type';
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

const MIN_SCORE = 1;
const MAX_SCORE = 10;
const DEFAULT_SCORE_ON_PARSE_FAILURE = 5;

/**
 * Contiene toda la lógica de negocio de los intentos de speaking del
 * estudiante: valida que el área tenga una práctica configurada, llama a
 * AICompletionService con el prompt de evaluación del docente
 * (SpeakingPractice.prompt) + la transcripción del estudiante, y persiste el
 * resultado (audioUrl, transcripción, retroalimentación, calificación).
 *
 * El estudiante nunca elige el proveedor/modelo — eso ya lo configuró el
 * docente en SpeakingPractice; este servicio solo lo consume.
 */
@Injectable()
export class SpeakingResultsService {
  private readonly logger = new Logger(SpeakingResultsService.name);

  constructor(
    private readonly speakingResultsRepository: SpeakingResultsRepository,
    private readonly protectedAreasService: ProtectedAreasService,
    private readonly speakingPracticesService: SpeakingPracticesService,
    private readonly aiCompletionService: AICompletionService,
  ) {}

  async create(
    dto: CreateSpeakingResultDto,
    studentId: string,
    requester: AuthenticatedUser,
  ): Promise<SpeakingResultResponseDoc> {
    // Lanza 404 si el área no existe o (siendo STUDENT) no está publicada.
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

    const { feedback, score } = await this.evaluate(
      practice.providerId,
      practice.model,
      practice.prompt,
      dto.transcription,
      buildAreaContext(area),
    );

    const result = await this.speakingResultsRepository.create({
      studentId,
      protectedAreaId: dto.protectedAreaId,
      speakingPracticeId: practice.id,
      audioUrl: dto.audioUrl,
      transcription: dto.transcription,
      feedback,
      score,
    });

    return this.toResponseDoc(result);
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
      'createdAt',
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

  /**
   * Resumen liviano (sin paginar) usado por StudentProgress para armar el
   * avance del estudiante en un área: cuántos intentos hizo y su mejor nota.
   */
  async getSummaryByStudentAndArea(
    protectedAreaId: string,
    studentId: string,
  ): Promise<{ attempts: number; bestScore: number | null }> {
    return this.speakingResultsRepository.getSummaryByStudentAndArea(
      studentId,
      protectedAreaId,
    );
  }

  /**
   * Llama a la IA con el contexto del área protegida (nombre + descripción,
   * ver buildAreaContext) + el prompt de evaluación del docente (texto
   * plano, sin HTML del editor) + la transcripción, forzando una respuesta
   * en JSON para poder extraer feedback y calificación de forma confiable.
   * Si el modelo no respeta el formato (pasa con cualquier LLM), se degrada
   * con gracia: se usa el texto crudo como feedback y una calificación
   * neutral.
   */
  private async evaluate(
    providerId: string,
    model: string,
    prompt: string,
    transcription: string,
    areaContext: string,
  ): Promise<{ feedback: string; score: number }> {
    const evaluationPrompt = stripHtml(prompt);

    const messages: AIChatMessage[] = [
      {
        role: 'system',
        content: `${areaContext}\n\n${evaluationPrompt}\n\nResponde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código, con exactamente esta forma: {"feedback": "retroalimentación de 2 a 4 oraciones", "score": <número entero del 1 al 10>}.`,
      },
      {
        role: 'user',
        content: `Transcripción de lo que dijo el estudiante:\n"""${transcription}"""`,
      },
    ];

    const result = await this.aiCompletionService.complete({
      providerId,
      model,
      messages,
      temperature: 0.4,
      maxTokens: 500,
    });

    return this.parseFeedback(result.content);
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

  private toResponseDoc(result: SpeakingResult): SpeakingResultResponseDoc {
    return plainToInstance(SpeakingResultResponseDoc, result, {
      excludeExtraneousValues: true,
    });
  }
}
