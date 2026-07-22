export const BADGE_SORTABLE_FIELDS = ['name', 'createdAt'] as const;
export type BadgeSortableField = (typeof BADGE_SORTABLE_FIELDS)[number];

export interface FindBadgesParams {
  page: number;
  limit: number;
  search?: string;
  protectedAreaId: string;
  sortField: BadgeSortableField;
  sortOrder: 'asc' | 'desc';
}

export interface CreateBadgeData {
  protectedAreaId: string;
  name: string;
  description: string;
  message: string;
  imageUrl: string;
}

export interface UpdateBadgeData {
  name?: string;
  description?: string;
  message?: string;
  imageUrl?: string;
}
