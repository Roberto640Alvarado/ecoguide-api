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
import { User } from '../../common/decorators/user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { ProtectedAreasService } from '../services/protected-areas.service';
import { CreateProtectedAreaDto } from '../dto/create-protected-area.dto';
import { UpdateProtectedAreaDto } from '../dto/update-protected-area.dto';
import { FindProtectedAreasQueryDto } from '../dto/find-protected-areas-query.dto';
import { ProtectedAreaResponseDoc } from '../doc/protected-area-response.doc';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

/**
 * CRUD de áreas protegidas. Lectura disponible para cualquier usuario
 * autenticado (STUDENT o TEACHER); escritura restringida a TEACHER.
 */
@ApiTags('ProtectedAreas')
@ApiBearerAuth()
@Controller('protected-areas')
export class ProtectedAreasController {
  constructor(private readonly protectedAreasService: ProtectedAreasService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista áreas protegidas. Los STUDENT solo ven las publicadas.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Ej: name:asc, createdAt:desc',
  })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Listado paginado de áreas protegidas.',
  })
  async findAll(
    @Query() query: FindProtectedAreasQueryDto,
    @User() requester: AuthenticatedUser,
  ): Promise<{
    message: string;
    data: PaginatedResult<ProtectedAreaResponseDoc>;
  }> {
    const data = await this.protectedAreasService.findAll(query, requester);

    return { message: 'Áreas protegidas obtenidas correctamente.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de un área protegida.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Área protegida encontrada.' })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async findOne(
    @Param('id') id: string,
    @User() requester: AuthenticatedUser,
  ): Promise<{ message: string; data: ProtectedAreaResponseDoc }> {
    const data = await this.protectedAreasService.findByIdOrThrow(
      id,
      requester,
    );

    return { message: 'Área protegida obtenida correctamente.', data };
  }

  @Post()
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Crea una nueva área protegida.' })
  @ApiResponse({
    status: 201,
    description: 'Área protegida creada correctamente.',
  })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateProtectedAreaDto,
    @User('id') userId: string,
  ): Promise<{ message: string; data: ProtectedAreaResponseDoc }> {
    const data = await this.protectedAreasService.create(dto, userId);

    return { message: 'Área protegida creada correctamente.', data };
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Actualiza los datos de un área protegida.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Área protegida actualizada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProtectedAreaDto,
  ): Promise<{ message: string; data: ProtectedAreaResponseDoc }> {
    const data = await this.protectedAreasService.update(id, dto);

    return { message: 'Área protegida actualizada correctamente.', data };
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Despublica un área protegida (soft delete, isPublished=false).',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Área protegida despublicada correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Área protegida no encontrada.' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; data: null }> {
    await this.protectedAreasService.remove(id);

    return {
      message: 'Área protegida despublicada correctamente.',
      data: null,
    };
  }
}
