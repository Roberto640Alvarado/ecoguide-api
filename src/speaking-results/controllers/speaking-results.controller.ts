import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { SpeakingResultsService } from '../services/speaking-results.service';
import { CreateSpeakingResultDto } from '../dto/create-speaking-result.dto';
import { SpeakingResultResponseDoc } from '../doc/speaking-result-response.doc';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

/**
 * Runtime del estudiante para la práctica de speaking: envía su grabación
 * (audio ya subido + transcripción generada en el navegador) y recibe
 * retroalimentación de IA. Exclusivo de STUDENT — la config del docente vive
 * en /speaking-practices.
 */
@ApiTags('SpeakingResults')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('speaking-results')
export class SpeakingResultsController {
  constructor(
    private readonly speakingResultsService: SpeakingResultsService,
  ) {}

  @Get('by-area/:protectedAreaId')
  @ApiOperation({
    summary: 'Lista los intentos de speaking del estudiante en un área.',
  })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Ej: createdAt:desc, score:desc',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado de intentos.' })
  async findByArea(
    @Param('protectedAreaId') protectedAreaId: string,
    @Query() query: PaginationQueryDto,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{
    message: string;
    data: PaginatedResult<SpeakingResultResponseDoc>;
  }> {
    const data = await this.speakingResultsService.findByArea(
      protectedAreaId,
      studentId,
      requester,
      query,
    );

    return { message: 'Intentos de speaking obtenidos correctamente.', data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Envía un intento de speaking (audio + transcripción) y obtiene retroalimentación de IA.',
  })
  @ApiResponse({
    status: 201,
    description: 'Intento evaluado y guardado correctamente.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Área protegida no encontrada o sin práctica de speaking configurada.',
  })
  async create(
    @Body() dto: CreateSpeakingResultDto,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{ message: string; data: SpeakingResultResponseDoc }> {
    const data = await this.speakingResultsService.create(
      dto,
      studentId,
      requester,
    );

    return { message: 'Intento de speaking evaluado correctamente.', data };
  }
}
