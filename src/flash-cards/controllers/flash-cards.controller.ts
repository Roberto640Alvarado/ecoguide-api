import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { FlashCardType, UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { FlashCardsService } from '../services/flash-cards.service';
import { CreateFlashCardDto } from '../dto/create-flash-card.dto';
import { UpdateFlashCardDto } from '../dto/update-flash-card.dto';
import { FindFlashCardsQueryDto } from '../dto/find-flash-cards-query.dto';
import { FlashCardResponseDoc } from '../doc/flash-card-response.doc';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

/**
 * CRUD de flashcards. Lectura disponible para cualquier usuario autenticado
 * (STUDENT o TEACHER); escritura restringida a TEACHER.
 */
@ApiTags('FlashCards')
@ApiBearerAuth()
@Controller('flash-cards')
export class FlashCardsController {
  constructor(private readonly flashCardsService: FlashCardsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista las flashcards de un área protegida específica.',
  })
  @ApiQuery({ name: 'protectedAreaId', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Ej: order:asc, title:desc',
  })
  @ApiQuery({ name: 'type', required: false, enum: FlashCardType })
  @ApiResponse({ status: 200, description: 'Listado paginado de flashcards.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async findAllByArea(@Query() query: FindFlashCardsQueryDto): Promise<{
    message: string;
    data: PaginatedResult<FlashCardResponseDoc>;
  }> {
    const data = await this.flashCardsService.findAllByArea(query);

    return { message: 'Flashcards obtenidas correctamente.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de una flashcard.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Flashcard encontrada.' })
  @ApiResponse({ status: 404, description: 'Flashcard no encontrada.' })
  async findOne(
    @Param('id') id: string,
  ): Promise<{ message: string; data: FlashCardResponseDoc }> {
    const data = await this.flashCardsService.findByIdOrThrow(id);

    return { message: 'Flashcard obtenida correctamente.', data };
  }

  @Post()
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea una nueva flashcard.' })
  @ApiResponse({ status: 201, description: 'Flashcard creada correctamente.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async create(
    @Body() dto: CreateFlashCardDto,
  ): Promise<{ message: string; data: FlashCardResponseDoc }> {
    const data = await this.flashCardsService.create(dto);

    return { message: 'Flashcard creada correctamente.', data };
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualiza los datos de una flashcard.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Flashcard actualizada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Flashcard no encontrada.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFlashCardDto,
  ): Promise<{ message: string; data: FlashCardResponseDoc }> {
    const data = await this.flashCardsService.update(id, dto);

    return { message: 'Flashcard actualizada correctamente.', data };
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina una flashcard.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Flashcard eliminada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Flashcard no encontrada.' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; data: null }> {
    await this.flashCardsService.remove(id);

    return { message: 'Flashcard eliminada correctamente.', data: null };
  }
}
