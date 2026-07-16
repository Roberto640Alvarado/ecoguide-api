import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { UsersRepository } from '../repositories/users.repository';
import { CreateUserData } from '../types/create-user.type';

const SALT_ROUNDS = 10;

/**
 * Contiene toda la lógica de negocio relacionada a usuarios.
 * Consumido por AuthModule y PasswordResetModule.
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
}
