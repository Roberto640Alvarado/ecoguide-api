export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface SortParam {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Convierte un string "campo:asc|desc" (query param `sort`) en un objeto
 * seguro, validando el campo contra una whitelist para evitar inyecciones
 * en el `orderBy` de Prisma.
 */
export function parseSort<T extends string>(
  sort: string | undefined,
  allowedFields: readonly T[],
  defaultField: T,
): { field: T; order: 'asc' | 'desc' } {
  if (!sort) {
    return { field: defaultField, order: 'desc' };
  }

  const [field, order] = sort.split(':');
  const safeField = allowedFields.includes(field as T)
    ? (field as T)
    : defaultField;
  const safeOrder = order === 'asc' ? 'asc' : 'desc';

  return { field: safeField, order: safeOrder };
}
