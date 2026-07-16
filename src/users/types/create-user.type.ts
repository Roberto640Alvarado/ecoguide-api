import { UserRole } from '@prisma/client';

export interface CreateUserData {
  name: string;
  lastName: string;
  email: string;
  password: string;
  role?: UserRole;
}
