import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { UsersService } from '../services/users.service';
import { FindUsersQueryDto } from '../dto/find-users-query.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDoc } from '../doc/user-response.doc';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

/**
 * Panel administrativo de usuarios. Restringido a TEACHER: los estudiantes
 * consultan su propio perfil vía GET /auth/me, no aquí.
 */
@ApiTags('Users')
@ApiBearerAuth()
@Roles(UserRole.TEACHER)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista usuarios con paginación, búsqueda y orden.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Ej: name:asc, createdAt:desc',
  })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiResponse({ status: 200, description: 'Listado paginado de usuarios.' })
  async findAll(
    @Query() query: FindUsersQueryDto,
  ): Promise<{ message: string; data: PaginatedResult<UserResponseDoc> }> {
    const data = await this.usersService.findAll(query);

    return { message: 'Usuarios obtenidos correctamente.', data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtiene el detalle de un usuario.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  async findOne(
    @Param('id') id: string,
  ): Promise<{ message: string; data: UserResponseDoc }> {
    const data = await this.usersService.findByIdOrThrow(id);

    return { message: 'Usuario obtenido correctamente.', data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza los datos de un usuario.' })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  @ApiResponse({ status: 409, description: 'El correo ya está en uso.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<{ message: string; data: UserResponseDoc }> {
    const data = await this.usersService.update(id, dto);

    return { message: 'Usuario actualizado correctamente.', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Desactiva la cuenta de un usuario (soft delete, isActive=false).',
  })
  @ApiParam({ name: 'id' })
  @ApiResponse({
    status: 200,
    description: 'Usuario desactivado correctamente.',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; data: null }> {
    await this.usersService.deactivate(id);

    return { message: 'Usuario desactivado correctamente.', data: null };
  }
}
