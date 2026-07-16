import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserData } from '../types/create-user.type';

/**
 * Responsable únicamente del acceso a datos de la colección `users`.
 * Toda la lógica de negocio vive en UsersService.
 */
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  updatePassword(id: string, password: string): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { password } });
  }
}
