import { UserRole } from '@prisma/client';

export const USER_SORTABLE_FIELDS = [
  'name',
  'lastName',
  'email',
  'role',
  'createdAt',
] as const;

export type UserSortableField = (typeof USER_SORTABLE_FIELDS)[number];

export interface FindUsersParams {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  sortField: UserSortableField;
  sortOrder: 'asc' | 'desc';
}

export interface UpdateUserData {
  name?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  role?: UserRole;
  isActive?: boolean;
}
