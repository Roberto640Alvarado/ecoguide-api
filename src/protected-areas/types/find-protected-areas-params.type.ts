export const PROTECTED_AREA_SORTABLE_FIELDS = [
  'name',
  'createdAt',
  'updatedAt',
] as const;

export type ProtectedAreaSortableField =
  (typeof PROTECTED_AREA_SORTABLE_FIELDS)[number];

export interface FindProtectedAreasParams {
  page: number;
  limit: number;
  search?: string;
  isPublished?: boolean;
  sortField: ProtectedAreaSortableField;
  sortOrder: 'asc' | 'desc';
}

export interface CreateProtectedAreaData {
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  images?: string[];
  isPublished?: boolean;
  createdBy: string;
}

export interface UpdateProtectedAreaData {
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  isPublished?: boolean;
}
