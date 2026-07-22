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
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { BadgesService } from '../services/badges.service';
import { CreateBadgeDto } from '../dto/create-badge.dto';
import { UpdateBadgeDto } from '../dto/update-badge.dto';
import { FindBadgesQueryDto } from '../dto/find-badges-query.dto';
import { BadgeResponseDoc } from '../doc/badge-response.doc';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

/**
 * CRUD de insignias (badges). Por ahora, todo el módulo es exclusivo de
 * TEACHER: no existe (todavía) vista ni endpoint para el estudiante.
 */
@ApiTags('Badges')
@ApiBearerAuth()
@Roles(UserRole.TEACHER)
@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista las insignias de un área protegida específica.',
  })
  @ApiQuery({ name: 'protectedAreaId', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Ej: createdAt:asc, name:desc',
  })
  @ApiResponse({ status: 200, description: 'Listado paginado de insignias.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async findAllByArea(@Query() query: FindBadgesQueryDto): Promise<{
    message: string;
    data: PaginatedResult<BadgeResponseDoc>;
  }> {
    const data = await this.badgesService.findAllByArea(query);

    return { message: 'Insignias obtenidas correctamente.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de una insignia.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Insignia encontrada.' })
  @ApiResponse({ status: 404, description: 'Insignia no encontrada.' })
  async findOne(
    @Param('id') id: string,
  ): Promise<{ message: string; data: BadgeResponseDoc }> {
    const data = await this.badgesService.findByIdOrThrow(id);

    return { message: 'Insignia obtenida correctamente.', data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea una nueva insignia.' })
  @ApiResponse({ status: 201, description: 'Insignia creada correctamente.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async create(
    @Body() dto: CreateBadgeDto,
  ): Promise<{ message: string; data: BadgeResponseDoc }> {
    const data = await this.badgesService.create(dto);

    return { message: 'Insignia creada correctamente.', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza los datos de una insignia.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Insignia actualizada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Insignia no encontrada.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBadgeDto,
  ): Promise<{ message: string; data: BadgeResponseDoc }> {
    const data = await this.badgesService.update(id, dto);

    return { message: 'Insignia actualizada correctamente.', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina una insignia.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Insignia eliminada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Insignia no encontrada.' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; data: null }> {
    await this.badgesService.remove(id);

    return { message: 'Insignia eliminada correctamente.', data: null };
  }
}
