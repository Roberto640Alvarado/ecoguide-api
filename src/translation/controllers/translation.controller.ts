import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TranslationService } from '../services/translation.service';
import { TranslateBatchDto } from '../dto/translate-batch.dto';
import { TranslateBatchResponseDoc } from '../doc/translate-batch-response.doc';

/**
 * Traducción de contenido dinámico (lo que el docente escribió, o lo que
 * generó la IA) al idioma seleccionado en el botón de idioma. Disponible
 * para STUDENT y TEACHER (el guard global ya exige JWT; no hace falta
 * restringir por rol).
 */
@ApiTags('Translation')
@ApiBearerAuth()
@Controller('translation')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Traduce un lote de textos dinámicos al idioma indicado, cacheando el resultado.',
  })
  @ApiResponse({ status: 200, description: 'Textos traducidos.' })
  async translateBatch(
    @Body() dto: TranslateBatchDto,
  ): Promise<{ message: string; data: TranslateBatchResponseDoc }> {
    const translations = await this.translationService.translateBatch(
      dto.texts,
      dto.targetLanguage,
    );

    return {
      message: 'Textos traducidos correctamente.',
      data: { translations },
    };
  }
}
