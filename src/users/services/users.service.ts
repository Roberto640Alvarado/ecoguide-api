import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { UsersRepository } from '../repositories/users.repository';
import { CreateUserData } from '../types/create-user.type';
import { USER_SORTABLE_FIELDS } from '../types/find-users-params.type';
import { UserResponseDoc } from '../doc/user-response.doc';
import { FindUsersQueryDto } from '../dto/find-users-query.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import {
  PaginatedResult,
  parseSort,
} from '../../common/interfaces/paginated-result.interface';

const SALT_ROUNDS = 10;
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/**
 * Contiene toda la lógica de negocio relacionada a usuarios.
 * Consumido por AuthModule, PasswordResetModule y UsersController.
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email.toLowerCase().trim());
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async create(data: CreateUserData): Promise<User> {
    const email = data.email.toLowerCase().trim();
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException(
        'Ya existe una cuenta registrada con este correo.',
      );
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    return this.usersRepository.create({
      ...data,
      email,
      password: hashedPassword,
    });
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.usersRepository.updatePassword(id, hashedPassword);
  }

  async findAll(
    query: FindUsersQueryDto,
  ): Promise<PaginatedResult<UserResponseDoc>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const { field: sortField, order: sortOrder } = parseSort(
      query.sort,
      USER_SORTABLE_FIELDS,
      'createdAt',
    );

    const { items, total } = await this.usersRepository.findAll({
      page,
      limit,
      search: query.search,
      role: query.role,
      sortField,
      sortOrder,
    });

    return {
      items: items.map((user) =>
        plainToInstance(UserResponseDoc, user, {
          excludeExtraneousValues: true,
        }),
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findByIdOrThrow(id: string): Promise<UserResponseDoc> {
    const user = await this.getUserOrThrow(id);

    return plainToInstance(UserResponseDoc, user, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDoc> {
    await this.getUserOrThrow(id);

    if (dto.email) {
      const email = dto.email.toLowerCase().trim();
      const existingUser = await this.usersRepository.findByEmail(email);

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(
          'Ya existe una cuenta registrada con este correo.',
        );
      }

      dto.email = email;
    }

    const updated = await this.usersRepository.update(id, dto);

    return plainToInstance(UserResponseDoc, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * "Elimina" un usuario desactivando la cuenta (isActive = false) en vez de
   * borrarlo. Un hard delete propagaría por cascada (StudentProgress,
   * SpeakingResult, ProtectedArea creadas por el usuario si es TEACHER, etc.)
   * y sería irreversible.
   */
  async deactivate(id: string): Promise<void> {
    await this.getUserOrThrow(id);
    await this.usersRepository.deactivate(id);
  }

  private async getUserOrThrow(id: string): Promise<User> {
    if (!OBJECT_ID_REGEX.test(id)) {
      throw new BadRequestException('El id proporcionado no es válido.');
    }

    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return user;
  }
}
