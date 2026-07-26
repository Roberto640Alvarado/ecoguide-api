import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { StudentProgressRepository } from '../repositories/student-progress.repository';
import { StudentAreaProgressDoc } from '../doc/student-area-progress-response.doc';
import { ProtectedAreasService } from '../../protected-areas/services/protected-areas.service';
import { ProtectedAreaResponseDoc } from '../../protected-areas/doc/protected-area-response.doc';
import { FlashCardsService } from '../../flash-cards/services/flash-cards.service';
import { SpeakingPracticesService } from '../../speaking-practices/services/speaking-practices.service';
import { SpeakingResultsService } from '../../speaking-results/services/speaking-results.service';
import { ChatbotConfigsService } from '../../chatbot/services/chatbot-configs.service';
import { ChatbotConversationsService } from '../../chatbot-conversations/services/chatbot-conversations.service';
import { TestsService } from '../../tests/services/tests.service';
import { TestResponseDoc } from '../../tests/doc/test-response.doc';
import { StudentTestsService } from '../../student-tests/services/student-tests.service';
import { UsersService } from '../../users/services/users.service';
import { BadgesService } from '../../badges/services/badges.service';
import { BadgeAwardResultDoc } from '../../badges/doc/badge-award-result.doc';
import { BadgeResponseDoc } from '../../badges/doc/badge-response.doc';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { FindProtectedAreasQueryDto } from '../../protected-areas/dto/find-protected-areas-query.dto';

/**
 * Nota mínima (sobre el total de 10 de un examen) para que el intento
 * cuente como "aprobado" a efectos de otorgar la insignia del área — fija,
 * independiente del `passingScore` que el docente configuró en el Test (ese
 * campo solo determina el indicador de "examen aprobado" que ve el propio
 * estudiante/docente en el avance, no el desbloqueo de la insignia).
 */
const BADGE_MIN_TEST_SCORE = 6;

interface AreaProgressFlags {
  flashCardsAvailable: boolean;
  speakingAvailable: boolean;
  chatbotAvailable: boolean;
  testAvailable: boolean;
  flashCardsDone: boolean;
  speakingDone: boolean;
  chatbotDone: boolean;
  testPassed: boolean;
  speakingSummary: {
    attempts: number;
    finished: number;
    bestScore: number | null;
  };
  chatbotSummary: { total: number; finished: number };
  testSummary: { attemptsUsed: number; bestScore: number | null };
  test: TestResponseDoc | null;
}

/**
 * Arma el avance del estudiante agregando en tiempo real lo que ya existe en
 * cada módulo (SpeakingResults, ChatbotConversations, StudentTests) más el
 * único dato que no tiene rastro propio (flashcards vistas, ver
 * StudentProgressRepository). No se mantiene un documento de progreso
 * "maestro" sincronizado a mano en cada módulo — eso duplicaría la fuente de
 * verdad y podría desincronizarse; en cambio, siempre se calcula fresco a
 * partir de los datos reales.
 */
@Injectable()
export class StudentProgressService {
  constructor(
    private readonly studentProgressRepository: StudentProgressRepository,
    private readonly protectedAreasService: ProtectedAreasService,
    private readonly flashCardsService: FlashCardsService,
    private readonly speakingPracticesService: SpeakingPracticesService,
    private readonly speakingResultsService: SpeakingResultsService,
    private readonly chatbotConfigsService: ChatbotConfigsService,
    private readonly chatbotConversationsService: ChatbotConversationsService,
    private readonly testsService: TestsService,
    private readonly studentTestsService: StudentTestsService,
    private readonly usersService: UsersService,
    private readonly badgesService: BadgesService,
  ) {}

  async markFlashcardsCompleted(
    protectedAreaId: string,
    studentId: string,
    requester: AuthenticatedUser,
  ): Promise<void> {
    await this.protectedAreasService.findByIdOrThrow(
      protectedAreaId,
      requester,
    );

    await this.studentProgressRepository.markFlashcardsCompleted(
      studentId,
      protectedAreaId,
    );
  }

  async getOverview(
    studentId: string,
    requester: AuthenticatedUser,
    query: PaginationQueryDto,
    forcePublishedOnly = false,
  ): Promise<PaginatedResult<StudentAreaProgressDoc>> {
    const areasQuery: FindProtectedAreasQueryDto = forcePublishedOnly
      ? { ...query, isPublished: true }
      : query;
    const areasPage = await this.protectedAreasService.findAll(
      areasQuery,
      requester,
    );

    const flashProgress =
      await this.studentProgressRepository.findAllByStudent(studentId);
    const flashCompletedByArea = new Map(
      flashProgress.map((p) => [p.protectedAreaId, p.completedFlashcards]),
    );

    const items = await Promise.all(
      areasPage.items.map((area) =>
        this.buildAreaProgress(
          area,
          studentId,
          flashCompletedByArea.get(area.id) ?? false,
        ),
      ),
    );

    return { items, meta: areasPage.meta };
  }

  async getByArea(
    protectedAreaId: string,
    studentId: string,
    requester: AuthenticatedUser,
  ): Promise<StudentAreaProgressDoc> {
    const area = await this.protectedAreasService.findByIdOrThrow(
      protectedAreaId,
      requester,
    );

    const flashProgress =
      await this.studentProgressRepository.findByStudentAndArea(
        studentId,
        protectedAreaId,
      );

    return this.buildAreaProgress(
      area,
      studentId,
      flashProgress?.completedFlashcards ?? false,
    );
  }

  /**
   * Variante para el docente: mismo cálculo que getOverview, pero para
   * cualquier estudiante (no el propio requester) — valida que el usuario
   * exista y solo considera áreas publicadas, que son las únicas en las que
   * el estudiante pudo haber generado actividad real.
   */
  async getOverviewForStudent(
    studentId: string,
    requester: AuthenticatedUser,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<StudentAreaProgressDoc>> {
    await this.usersService.findByIdOrThrow(studentId);

    return this.getOverview(studentId, requester, query, true);
  }

  /** Variante para el docente de getByArea, para cualquier estudiante. */
  async getByAreaForStudent(
    protectedAreaId: string,
    studentId: string,
    requester: AuthenticatedUser,
  ): Promise<StudentAreaProgressDoc> {
    await this.usersService.findByIdOrThrow(studentId);

    return this.getByArea(protectedAreaId, studentId, requester);
  }

  /** Todas las insignias que el estudiante ya obtuvo, en cualquier área
   * (uso: dashboard del estudiante). */
  async getAllEarnedBadges(studentId: string): Promise<BadgeResponseDoc[]> {
    return this.badgesService.getAllEarnedForStudent(studentId);
  }

  /** Insignias que el estudiante ya obtuvo para un área (sin revisar/otorgar
   * nada nuevo — ver checkAndAwardBadges para eso). Usado por la vista de
   * "Nota" del recorrido para mostrar la insignia obtenida. */
  async getEarnedBadges(
    protectedAreaId: string,
    studentId: string,
    requester: AuthenticatedUser,
  ): Promise<BadgeResponseDoc[]> {
    await this.protectedAreasService.findByIdOrThrow(
      protectedAreaId,
      requester,
    );

    return this.badgesService.getEarnedForStudentAndArea(
      studentId,
      protectedAreaId,
    );
  }

  /**
   * Revisa si el estudiante ya terminó el recorrido completo de un área
   * (todos los pasos configurados hechos, examen con nota >= 6/10 si el
   * área tiene examen) y, de ser así, le otorga las insignias del área que
   * todavía no tenga (ver BadgesService.awardAreaBadgesToStudent).
   * Idempotente y seguro de llamar en cada visita a la vista de progreso
   * del estudiante — solo se dispara el desbloqueo (justUnlocked) la
   * primera vez que se cumple la condición.
   */
  async checkAndAwardBadges(
    protectedAreaId: string,
    studentId: string,
    requester: AuthenticatedUser,
  ): Promise<BadgeAwardResultDoc> {
    const area = await this.protectedAreasService.findByIdOrThrow(
      protectedAreaId,
      requester,
    );

    const flashProgress =
      await this.studentProgressRepository.findByStudentAndArea(
        studentId,
        protectedAreaId,
      );

    const flags = await this.computeAreaFlags(
      area,
      studentId,
      flashProgress?.completedFlashcards ?? false,
    );

    const stepsTotal = [
      flags.flashCardsAvailable,
      flags.speakingAvailable,
      flags.chatbotAvailable,
      flags.testAvailable,
    ].filter(Boolean).length;

    const testPassedForBadge =
      flags.testAvailable &&
      flags.testSummary.bestScore !== null &&
      flags.testSummary.bestScore >= BADGE_MIN_TEST_SCORE;

    const tourCompleted =
      stepsTotal > 0 &&
      (!flags.flashCardsAvailable || flags.flashCardsDone) &&
      (!flags.speakingAvailable || flags.speakingDone) &&
      (!flags.chatbotAvailable || flags.chatbotDone) &&
      (!flags.testAvailable || testPassedForBadge);

    if (tourCompleted) {
      return this.badgesService.awardAreaBadgesToStudent(
        studentId,
        protectedAreaId,
      );
    }

    const earnedBadges = await this.badgesService.getEarnedForStudentAndArea(
      studentId,
      protectedAreaId,
    );

    return plainToInstance(
      BadgeAwardResultDoc,
      { completed: false, justUnlocked: [], earnedBadges },
      { excludeExtraneousValues: true },
    );
  }

  private async computeAreaFlags(
    area: ProtectedAreaResponseDoc,
    studentId: string,
    flashcardsCompleted: boolean,
  ): Promise<AreaProgressFlags> {
    const [
      flashCardsTotal,
      practice,
      speakingSummary,
      chatbotConfig,
      chatbotSummary,
      test,
    ] = await Promise.all([
      this.flashCardsService
        .findAllByArea({
          protectedAreaId: area.id,
          page: 1,
          limit: 1,
        })
        .then((result) => result.meta.total),
      this.speakingPracticesService.findByProtectedArea(area.id),
      this.speakingResultsService.getSummaryByStudentAndArea(
        area.id,
        studentId,
      ),
      this.chatbotConfigsService.findByProtectedArea(area.id),
      this.chatbotConversationsService.getSummaryByStudentAndArea(
        area.id,
        studentId,
      ),
      this.testsService.findByProtectedArea(area.id),
    ]);

    const testSummary = test
      ? await this.studentTestsService.getSummaryByStudentAndTest(
          test.id,
          studentId,
        )
      : { attemptsUsed: 0, bestScore: null };

    const flashCardsAvailable = flashCardsTotal > 0;
    const speakingAvailable = !!practice && practice.isActive;
    const chatbotAvailable = !!chatbotConfig && chatbotConfig.isActive;
    const testAvailable = !!test && test.isActive;

    const flashCardsDone = flashCardsAvailable && flashcardsCompleted;
    const speakingDone = speakingAvailable && speakingSummary.finished > 0;
    const chatbotDone = chatbotAvailable && chatbotSummary.finished > 0;
    const testPassed =
      testAvailable &&
      testSummary.bestScore !== null &&
      test != null &&
      testSummary.bestScore >= test.passingScore;

    return {
      flashCardsAvailable,
      speakingAvailable,
      chatbotAvailable,
      testAvailable,
      flashCardsDone,
      speakingDone,
      chatbotDone,
      testPassed,
      speakingSummary,
      chatbotSummary,
      testSummary,
      test,
    };
  }

  private async buildAreaProgress(
    area: ProtectedAreaResponseDoc,
    studentId: string,
    flashcardsCompleted: boolean,
  ): Promise<StudentAreaProgressDoc> {
    const flags = await this.computeAreaFlags(
      area,
      studentId,
      flashcardsCompleted,
    );

    const stepsTotal = [
      flags.flashCardsAvailable,
      flags.speakingAvailable,
      flags.chatbotAvailable,
      flags.testAvailable,
    ].filter(Boolean).length;
    const stepsCompleted = [
      flags.flashCardsDone,
      flags.speakingDone,
      flags.chatbotDone,
      flags.testPassed,
    ].filter(Boolean).length;

    return plainToInstance(
      StudentAreaProgressDoc,
      {
        protectedAreaId: area.id,
        areaName: area.name,
        areaImage: area.images[0] ?? null,
        stepsCompleted,
        stepsTotal,
        progressPercent:
          stepsTotal > 0 ? Math.round((stepsCompleted / stepsTotal) * 100) : 0,
        flashCards: {
          available: flags.flashCardsAvailable,
          completed: flags.flashCardsDone,
        },
        speaking: {
          available: flags.speakingAvailable,
          attempts: flags.speakingSummary.attempts,
          finished: flags.speakingSummary.finished,
          bestScore: flags.speakingSummary.bestScore,
        },
        chatbot: {
          available: flags.chatbotAvailable,
          conversations: flags.chatbotSummary.total,
          finishedConversations: flags.chatbotSummary.finished,
        },
        test: {
          available: flags.testAvailable,
          attemptsUsed: flags.testSummary.attemptsUsed,
          maxAttempts: flags.test?.maxAttempts ?? null,
          bestScore: flags.testSummary.bestScore,
          passingScore: flags.test?.passingScore ?? null,
          passed: flags.testPassed,
        },
      },
      { excludeExtraneousValues: true },
    );
  }
}
