import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Test } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { TestsRepository } from '../repositories/tests.repository';
import { CreateTestDto } from '../dto/create-test.dto';
import { CreateQuestionDto } from '../dto/create-question.dto';
import { UpdateTestDto } from '../dto/update-test.dto';
import { TestResponseDoc } from '../doc/test-response.doc';
import { QuestionData } from '../types/test.type';
import { ProtectedAreasService } from '../../protected-areas/services/protected-areas.service';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/**
 * Contiene toda la lógica de negocio del examen del docente. Es 1:1 con el
 * área protegida (igual patrón que SpeakingPractice/ChatbotConfig), pero con
 * N preguntas embebidas (composite type `Question`).
 *
 * Valida que `passingScore` no supere la suma de puntos de todas las
 * preguntas y que `correctAnswer` sea siempre una de las `options` — evita
 * guardar un examen imposible de aprobar o con una respuesta correcta que no
 * existe entre las opciones.
 */
@Injectable()
export class TestsService {
  constructor(
    private readonly testsRepository: TestsRepository,
    private readonly protectedAreasService: ProtectedAreasService,
  ) {}

  async findByProtectedArea(
    protectedAreaId: string,
  ): Promise<TestResponseDoc | null> {
    const areaExists =
      await this.protectedAreasService.existsById(protectedAreaId);

    if (!areaExists) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    const test =
      await this.testsRepository.findByProtectedAreaId(protectedAreaId);

    return test ? this.toResponseDoc(test) : null;
  }

  async findByIdOrThrow(id: string): Promise<TestResponseDoc> {
    const test = await this.getTestOrThrow(id);

    return this.toResponseDoc(test);
  }

  async create(dto: CreateTestDto): Promise<TestResponseDoc> {
    const areaExists = await this.protectedAreasService.existsById(
      dto.protectedAreaId,
    );

    if (!areaExists) {
      throw new NotFoundException('Área protegida no encontrada.');
    }

    const existing = await this.testsRepository.findByProtectedAreaId(
      dto.protectedAreaId,
    );

    if (existing) {
      throw new ConflictException(
        'Esta área protegida ya tiene un examen configurado. Edítalo en vez de crear otro.',
      );
    }

    this.validateQuestionsAndPassingScore(dto.questions, dto.passingScore);

    const test = await this.testsRepository.create({
      protectedAreaId: dto.protectedAreaId,
      title: dto.title,
      description: dto.description,
      maxAttempts: dto.maxAttempts,
      passingScore: dto.passingScore,
      questions: dto.questions.map((question) => this.toQuestionData(question)),
      isActive: dto.isActive,
    });

    return this.toResponseDoc(test);
  }

  async update(id: string, dto: UpdateTestDto): Promise<TestResponseDoc> {
    const existing = await this.getTestOrThrow(id);

    const questions = dto.questions
      ? dto.questions.map((question) => this.toQuestionData(question))
      : (existing.questions as QuestionData[]);
    const passingScore = dto.passingScore ?? existing.passingScore;

    this.validateQuestionsAndPassingScore(questions, passingScore);

    const updated = await this.testsRepository.update(id, {
      title: dto.title,
      description: dto.description,
      maxAttempts: dto.maxAttempts,
      passingScore: dto.passingScore,
      questions: dto.questions ? questions : undefined,
      isActive: dto.isActive,
    });

    return this.toResponseDoc(updated);
  }

  async deactivate(id: string): Promise<void> {
    await this.getTestOrThrow(id);
    await this.testsRepository.deactivate(id);
  }

  private validateQuestionsAndPassingScore(
    questions: (CreateQuestionDto | QuestionData)[],
    passingScore: number,
  ): void {
    for (const question of questions) {
      if (!question.options.includes(question.correctAnswer)) {
        throw new BadRequestException(
          `La respuesta correcta de "${question.question}" debe ser una de sus opciones.`,
        );
      }
    }

    const totalScore = questions.reduce((sum, q) => sum + q.score, 0);

    if (passingScore > totalScore) {
      throw new BadRequestException(
        `El puntaje mínimo (${passingScore}) no puede ser mayor al puntaje total posible (${totalScore}).`,
      );
    }
  }

  private toQuestionData(dto: CreateQuestionDto): QuestionData {
    return {
      id: randomUUID(),
      question: dto.question,
      options: dto.options,
      correctAnswer: dto.correctAnswer,
      score: dto.score,
    };
  }

  private toResponseDoc(test: Test): TestResponseDoc {
    return plainToInstance(TestResponseDoc, test, {
      excludeExtraneousValues: true,
    });
  }

  private async getTestOrThrow(id: string): Promise<Test> {
    if (!OBJECT_ID_REGEX.test(id)) {
      throw new BadRequestException('El id proporcionado no es válido.');
    }

    const test = await this.testsRepository.findById(id);

    if (!test) {
      throw new NotFoundException('Examen no encontrado.');
    }

    return test;
  }
}
