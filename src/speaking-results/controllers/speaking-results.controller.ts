import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { SpeakingResultsService } from '../services/speaking-results.service';
import { EdgeTtsService } from '../services/edge-tts.service';
import { StartSpeakingResultDto } from '../dto/start-speaking-result.dto';
import { SynthesizeSpeechDto } from '../dto/synthesize-speech.dto';
import { SpeakingResultResponseDoc } from '../doc/speaking-result-response.doc';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024;
const ALLOWED_AUDIO_MIME_TYPES = [
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/x-m4a',
];

/**
 * Runtime del estudiante para la práctica de speaking: una llamada
 * multi-turno con la IA (mismo patrón que ChatbotConversationsController).
 * El audio de cada turno nunca se persiste — se transcribe en memoria
 * (Groq/Whisper) y se descarta; solo el texto queda guardado. Exclusivo de
 * STUDENT — la config del docente vive en /speaking-practices.
 */
@ApiTags('SpeakingResults')
@ApiBearerAuth()
@Roles(UserRole.STUDENT)
@Controller('speaking-results')
export class SpeakingResultsController {
  constructor(
    private readonly speakingResultsService: SpeakingResultsService,
    private readonly edgeTtsService: EdgeTtsService,
  ) {}

  @Post('tts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Convierte texto a audio (voz neuronal) para reproducir un turno de la IA.',
  })
  @ApiProduces('audio/mpeg')
  @ApiResponse({
    status: 200,
    description: 'Audio generado (MP3) correctamente.',
  })
  async synthesizeSpeech(
    @Body() dto: SynthesizeSpeechDto,
    @Res() res: Response,
  ): Promise<void> {
    const audio = await this.edgeTtsService.synthesize(dto.text);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audio.length,
      'Cache-Control': 'no-store',
    });
    res.send(audio);
  }

  @Get('by-area/:protectedAreaId')
  @ApiOperation({
    summary: 'Lista las llamadas de speaking del estudiante en un área.',
  })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Ej: startedAt:desc',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado de llamadas.' })
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

    return { message: 'Llamadas de speaking obtenidas correctamente.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de una llamada de speaking.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Llamada encontrada.' })
  @ApiResponse({ status: 404, description: 'Llamada no encontrada.' })
  async findOne(
    @Param('id') id: string,
    @User('id') studentId: string,
  ): Promise<{ message: string; data: SpeakingResultResponseDoc }> {
    const data = await this.speakingResultsService.findByIdOrThrow(
      id,
      studentId,
    );

    return { message: 'Llamada de speaking obtenida correctamente.', data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Inicia una nueva llamada de práctica de speaking en un área (genera el saludo inicial de la IA).',
  })
  @ApiResponse({ status: 201, description: 'Llamada iniciada correctamente.' })
  @ApiResponse({
    status: 404,
    description:
      'Área protegida no encontrada o sin práctica de speaking configurada.',
  })
  async start(
    @Body() dto: StartSpeakingResultDto,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{ message: string; data: SpeakingResultResponseDoc }> {
    const data = await this.speakingResultsService.start(
      dto,
      studentId,
      requester,
    );

    return { message: 'Llamada de speaking iniciada correctamente.', data };
  }

  @Post(':id/turns')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Envía el audio del turno del estudiante, lo transcribe y devuelve la respuesta de la IA.',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Turno transcrito y respondido correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Llamada no encontrada.' })
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: MAX_AUDIO_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_AUDIO_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Solo se permiten audios WEBM, WAV, MP3, MP4 u OGG.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async sendTurn(
    @Param('id') id: string,
    @UploadedFile() audio: Express.Multer.File,
    @User('id') studentId: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{ message: string; data: SpeakingResultResponseDoc }> {
    if (!audio) {
      throw new BadRequestException('Debes adjuntar el audio del turno.');
    }

    const data = await this.speakingResultsService.sendTurn(
      id,
      studentId,
      requester,
      audio.buffer,
      audio.originalname,
      audio.mimetype,
    );

    return { message: 'Turno procesado correctamente.', data };
  }

  @Patch(':id/finish')
  @ApiOperation({
    summary:
      'Finaliza la llamada y genera la retroalimentación y calificación final.',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Llamada finalizada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Llamada no encontrada.' })
  async finish(
    @Param('id') id: string,
    @User('id') studentId: string,
  ): Promise<{ message: string; data: SpeakingResultResponseDoc }> {
    const data = await this.speakingResultsService.finish(id, studentId);

    return { message: 'Llamada finalizada correctamente.', data };
  }

  @Get('teacher/students/:studentId/by-area/:protectedAreaId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({
    summary:
      'Lista las llamadas de speaking de un estudiante en un área (uso del docente).',
  })
  @ApiParam({ name: 'studentId' })
  @ApiParam({ name: 'protectedAreaId' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Listado paginado de llamadas.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async findByStudentForTeacher(
    @Param('studentId') studentId: string,
    @Param('protectedAreaId') protectedAreaId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<{
    message: string;
    data: PaginatedResult<SpeakingResultResponseDoc>;
  }> {
    const data = await this.speakingResultsService.findByAreaForTeacher(
      protectedAreaId,
      studentId,
      query,
    );

    return { message: 'Llamadas de speaking obtenidas correctamente.', data };
  }

  @Get('teacher/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({
    summary:
      'Obtiene el detalle (turnos completos) de una llamada de speaking (uso del docente).',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Llamada encontrada.' })
  @ApiResponse({ status: 404, description: 'Llamada no encontrada.' })
  async findOneForTeacher(
    @Param('id') id: string,
  ): Promise<{ message: string; data: SpeakingResultResponseDoc }> {
    const data = await this.speakingResultsService.findByIdForTeacher(id);

    return { message: 'Llamada de speaking obtenida correctamente.', data };
  }
}
