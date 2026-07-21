import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { UploadFilesService } from '../services/upload-files.service';
import { UploadFileResponseDoc } from '../doc/upload-file-response.doc';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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
 * Endpoint genérico de subida de imágenes a Cloudinary, reutilizable por
 * cualquier módulo (ProtectedAreas, FlashCards, etc.). Solo TEACHER puede
 * subir archivos; el módulo no persiste nada, únicamente devuelve la URL
 * resultante para que el módulo que la solicitó la guarde en su propio
 * recurso.
 */
@ApiTags('UploadFiles')
@ApiBearerAuth()
@Controller('upload-files')
export class UploadFilesController {
  constructor(private readonly uploadFilesService: UploadFilesService) {}

  @Post()
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Sube una imagen a Cloudinary y devuelve su URL.' })
  @ApiQuery({
    name: 'folder',
    required: false,
    description:
      'Subcarpeta dentro de "ecoguide/" para organizar las imágenes (ej. protected-areas).',
  })
  @ApiResponse({ status: 201, description: 'Imagen subida correctamente.' })
  @ApiResponse({
    status: 400,
    description: 'Archivo faltante o formato no permitido.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              'Solo se permiten imágenes JPEG, PNG o WEBP.',
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ): Promise<{ message: string; data: UploadFileResponseDoc }> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo.');
    }

    const url = await this.uploadFilesService.uploadImage(
      file,
      folder ? `ecoguide/${folder}` : 'ecoguide',
    );

    return {
      message: 'Imagen subida correctamente.',
      data: { url },
    };
  }

  @Post('audio')
  @Roles(UserRole.STUDENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Sube un audio de práctica de speaking a Cloudinary y devuelve su URL.',
  })
  @ApiQuery({
    name: 'folder',
    required: false,
    description:
      'Subcarpeta dentro de "ecoguide/" para organizar los audios (ej. speaking-results).',
  })
  @ApiResponse({ status: 201, description: 'Audio subido correctamente.' })
  @ApiResponse({
    status: 400,
    description: 'Archivo faltante o formato no permitido.',
  })
  @UseInterceptors(
    FileInterceptor('file', {
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
  async uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ): Promise<{ message: string; data: UploadFileResponseDoc }> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo.');
    }

    const url = await this.uploadFilesService.uploadAudio(
      file,
      folder ? `ecoguide/${folder}` : 'ecoguide',
    );

    return {
      message: 'Audio subido correctamente.',
      data: { url },
    };
  }
}
