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
import { AIProvidersService } from '../services/ai-providers.service';
import { CreateAIProviderDto } from '../dto/create-ai-provider.dto';
import { UpdateAIProviderDto } from '../dto/update-ai-provider.dto';
import { CreateModelDto } from '../dto/create-model.dto';
import { UpdateModelDto } from '../dto/update-model.dto';
import { FindAIProvidersQueryDto } from '../dto/find-ai-providers-query.dto';
import { AIProviderResponseDoc } from '../doc/ai-provider-response.doc';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

/**
 * Panel administrativo de proveedores de IA. Restringido por completo a
 * TEACHER: contiene API keys y es infraestructura, no contenido educativo.
 */
@ApiTags('AIProviders')
@ApiBearerAuth()
@Roles(UserRole.TEACHER)
@Controller('ai-providers')
export class AIProvidersController {
  constructor(private readonly aiProvidersService: AIProvidersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista proveedores de IA con paginación, búsqueda y orden.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Ej: providerName:asc, createdAt:desc',
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Listado paginado de proveedores.' })
  async findAll(@Query() query: FindAIProvidersQueryDto): Promise<{
    message: string;
    data: PaginatedResult<AIProviderResponseDoc>;
  }> {
    const data = await this.aiProvidersService.findAll(query);

    return { message: 'Proveedores de IA obtenidos correctamente.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de un proveedor de IA.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Proveedor encontrado.' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado.' })
  async findOne(
    @Param('id') id: string,
  ): Promise<{ message: string; data: AIProviderResponseDoc }> {
    const data = await this.aiProvidersService.findByIdOrThrow(id);

    return { message: 'Proveedor obtenido correctamente.', data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra un nuevo proveedor de IA.' })
  @ApiResponse({ status: 201, description: 'Proveedor creado correctamente.' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un proveedor con ese nombre.',
  })
  async create(
    @Body() dto: CreateAIProviderDto,
  ): Promise<{ message: string; data: AIProviderResponseDoc }> {
    const data = await this.aiProvidersService.create(dto);

    return { message: 'Proveedor creado correctamente.', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza los datos de un proveedor de IA.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Proveedor actualizado correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado.' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un proveedor con ese nombre.',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAIProviderDto,
  ): Promise<{ message: string; data: AIProviderResponseDoc }> {
    const data = await this.aiProvidersService.update(id, dto);

    return { message: 'Proveedor actualizado correctamente.', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactiva un proveedor de IA (soft delete, isActive=false).',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Proveedor desactivado correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado.' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; data: null }> {
    await this.aiProvidersService.deactivate(id);

    return { message: 'Proveedor desactivado correctamente.', data: null };
  }

  @Post(':id/models')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agrega un modelo al catálogo del proveedor.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 201, description: 'Modelo agregado correctamente.' })
  @ApiResponse({ status: 404, description: 'Proveedor no encontrado.' })
  async addModel(
    @Param('id') id: string,
    @Body() dto: CreateModelDto,
  ): Promise<{ message: string; data: AIProviderResponseDoc }> {
    const data = await this.aiProvidersService.addModel(id, dto);

    return { message: 'Modelo agregado correctamente.', data };
  }

  @Patch(':id/models/:modelId')
  @ApiOperation({ summary: 'Actualiza un modelo del catálogo del proveedor.' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'modelId' })
  @ApiResponse({
    status: 200,
    description: 'Modelo actualizado correctamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor o modelo no encontrado.',
  })
  async updateModel(
    @Param('id') id: string,
    @Param('modelId') modelId: string,
    @Body() dto: UpdateModelDto,
  ): Promise<{ message: string; data: AIProviderResponseDoc }> {
    const data = await this.aiProvidersService.updateModel(id, modelId, dto);

    return { message: 'Modelo actualizado correctamente.', data };
  }

  @Delete(':id/models/:modelId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina un modelo del catálogo del proveedor.' })
  @ApiParam({ name: 'id' })
  @ApiParam({ name: 'modelId' })
  @ApiResponse({ status: 200, description: 'Modelo eliminado correctamente.' })
  @ApiResponse({
    status: 404,
    description: 'Proveedor o modelo no encontrado.',
  })
  async removeModel(
    @Param('id') id: string,
    @Param('modelId') modelId: string,
  ): Promise<{ message: string; data: AIProviderResponseDoc }> {
    const data = await this.aiProvidersService.removeModel(id, modelId);

    return { message: 'Modelo eliminado correctamente.', data };
  }
}
