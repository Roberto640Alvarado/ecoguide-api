import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { StudentTest } from '@prisma/client';
import { StudentTestsRepository } from '../repositories/student-tests.repository';
import { SubmitTestDto } from '../dto/submit-test.dto';
import { StudentTestResponseDoc } from '../doc/student-test-response.doc';
import { StudentTestConfigDoc } from '../doc/student-test-config.doc';
import {
  AnswerData,
  STUDENT_TEST_SORTABLE_FIELDS,
} from '../types/student-test.type';
import { ProtectedAreasService } from '../../protected-areas/services/protected-areas.service';
import { TestsService } from '../../tests/services/tests.service';
import { TestResponseDoc } from '../../tests/doc/test-response.doc';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import {
  PaginatedResult,
  parseSort,
} from '../../common/interfaces/paginated-result.interface';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

/**
 * Calcula la nota final del estudiante para el examen de un área: valida
 * intentos disponibles contra `Test.maxAttempts`, califica cada respuesta
 * comparándola (sin distinguir mayúsculas/espacios) contra
 * `Question.correctAnswer`, suma los puntos de las preguntas acertadas y
 * determina si el intento aprueba contra `Test.passingScore`.
 *
 * El estudiante nunca ve `correctAnswer` — StudentTestResponseDoc solo
 * expone si su propia respuesta fue correcta o no.
 */
@Injectable()
export class StudentTestsService {
  constructor(
    private readonly studentTestsRepository: StudentTestsRepository,
    private readonly protectedAreasService: ProtectedAreasService,
    private readonly testsService: TestsService,
  ) {}

  /**
   * Config del examen que el estudiante necesita para resolverlo: preguntas
   * sin `correctAnswer` (ver StudentQuestionDoc) más cuántos intentos ya
   * usó/le quedan, para que la UI pueda bloquear el botón de envío si ya
   * agotó `maxAttempts` antes de que intente enviar nada.
   */
  async getConfig(
    protectedAreaId: string,
    studentId: string,
    requester: AuthenticatedUser,
  ): Promise<StudentTestConfigDoc> {
    await this.protectedAreasService.findByIdOrThrow(
      protectedAreaId,
      requester,
    );

    const test = await this.testsService.findByProtectedArea(protectedAreaId);

    if (!test || !test.isActive) {
      throw new NotFoundException(
        'Esta área protegida no tiene un examen configurado.',
      );
    }

    const attemptsUsed =
      await this.studentTestsRepository.countByStudentAndTest(
        studentId,
        test.id,
      );

    return plainToInstance(
      StudentTestConfigDoc,
      {
        id: test.id,
        protectedAreaId: test.protectedAreaId,
        title: test.title,
        description: test.description,
        maxAttempts: test.maxAttempts,
        passingScore: test.passingScore,
        attemptsUsed,
        attemptsRemaining: Math.max(0, test.maxAttempts - attemptsUsed),
        questions: test.questions,
      },
      { excludeExtraneousValues: true },
    );
  }

  async submit(
    dto: SubmitTestDto,
    studentId: string,
    requester: AuthenticatedUser,
  ): Promise<StudentTestResponseDoc> {
    await this.protectedAreasService.findByIdOrThrow(
      dto.protectedAreaId,
      requester,
    );

    const test = await this.testsService.findByProtectedArea(
      dto.protectedAreaId,
    );

    if (!test || !test.isActive) {
      throw new NotFoundException(
        'Esta área protegida no tiene un examen configurado.',
      );
    }

    const attemptsUsed =
      await this.studentTestsRepository.countByStudentAndTest(
        studentId,
        test.id,
      );

    if (attemptsUsed >= test.maxAttempts) {
      throw new BadRequestException(
        'Ya alcanzaste el número máximo de intentos para este examen.',
      );
    }

    const { answers, score } = this.gradeAnswers(dto, test);
    const attempt = attemptsUsed + 1;

    const created = await this.studentTestsRepository.create({
      studentId,
      protectedAreaId: dto.protectedAreaId,
      testId: test.id,
      attempt,
      score,
      answers,
    });

    return this.toResponseDoc(created, test.passingScore);
  }

  async findByArea(
    protectedAreaId: string,
    studentId: string,
    requester: AuthenticatedUser,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<StudentTestResponseDoc>> {
    await this.protectedAreasService.findByIdOrThrow(
      protectedAreaId,
      requester,
    );

    const test = await this.testsService.findByProtectedArea(protectedAreaId);
    const passingScore = test?.passingScore ?? 0;

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { field: sortField, order: sortOrder } = parseSort(
      query.sort,
      STUDENT_TEST_SORTABLE_FIELDS,
      'createdAt',
    );

    const { items, total } =
      await this.studentTestsRepository.findAllByStudentAndArea(
        studentId,
        protectedAreaId,
        { page, limit, sortField, sortOrder },
      );

    return {
      items: items.map((item) => this.toResponseDoc(item, passingScore)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Valida que las respuestas enviadas correspondan exactamente (mismo
   * número, mismos ids, sin duplicados) a las preguntas del examen, y
   * califica cada una. La comparación normaliza espacios y mayúsculas para
   * no penalizar diferencias triviales de formato.
   */
  private gradeAnswers(
    dto: SubmitTestDto,
    test: TestResponseDoc,
  ): { answers: AnswerData[]; score: number } {
    const validQuestionIds = new Set(test.questions.map((q) => q.id));
    const answeredQuestionIds = new Set(dto.answers.map((a) => a.questionId));

    if (
      dto.answers.length !== test.questions.length ||
      answeredQuestionIds.size !== dto.answers.length ||
      dto.answers.some((answer) => !validQuestionIds.has(answer.questionId))
    ) {
      throw new BadRequestException(
        'Debes responder cada pregunta del examen exactamente una vez.',
      );
    }

    let score = 0;
    const answers: AnswerData[] = test.questions.map((question) => {
      const answer = dto.answers.find((a) => a.questionId === question.id)!;
      const isCorrect =
        this.normalize(answer.studentAnswer) ===
        this.normalize(question.correctAnswer);

      if (isCorrect) {
        score += question.score;
      }

      return {
        questionId: question.id,
        studentAnswer: answer.studentAnswer,
        isCorrect,
      };
    });

    return { answers, score };
  }

  private normalize(value: string): string {
    return value.trim().toLowerCase();
  }

  private toResponseDoc(
    studentTest: StudentTest,
    passingScore: number,
  ): StudentTestResponseDoc {
    return plainToInstance(
      StudentTestResponseDoc,
      {
        ...studentTest,
        passingScore,
        passed: studentTest.score >= passingScore,
      },
      { excludeExtraneousValues: true },
    );
  }
}
