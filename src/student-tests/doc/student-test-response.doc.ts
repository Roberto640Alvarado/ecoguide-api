import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { AnswerResponseDoc } from './answer-response.doc';

/**
 * `passingScore` y `passed` no son campos persistidos en StudentTest — se
 * calculan en StudentTestsService a partir del Test asociado y se anexan al
 * objeto plano antes de serializar, para que el frontend no tenga que volver
 * a pedir el examen solo para saber si el intento aprobó.
 */
@Exclude()
export class StudentTestResponseDoc {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  protectedAreaId: string;

  @Expose()
  @ApiProperty()
  testId: string;

  @Expose()
  @ApiProperty()
  attempt: number;

  @Expose()
  @ApiProperty()
  score: number;

  @Expose()
  @ApiProperty()
  passingScore: number;

  @Expose()
  @ApiProperty()
  passed: boolean;

  @Expose()
  @Type(() => AnswerResponseDoc)
  @ApiProperty({ type: [AnswerResponseDoc] })
  answers: AnswerResponseDoc[];

  @Expose()
  @ApiProperty()
  createdAt: Date;
}
