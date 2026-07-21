import { FlashCardType } from '@prisma/client';

export const FLASH_CARD_SORTABLE_FIELDS = [
  'order',
  'title',
  'createdAt',
] as const;

/**
 * Rango fijo de cada categoría dentro del recorrido educativo de un área
 * protegida. Se usa para auto-asignar `order` cuando no se recibe uno
 * explícito: order = rango * 1000 + <cantidad existente de ese tipo en el
 * área> + 1, de forma que ordenar por `order` ascendente agrupa las
 * flashcards por categoría en esta secuencia y, dentro de cada categoría,
 * por orden de creación.
 */
export const FLASH_CARD_TYPE_RANK: Record<FlashCardType, number> = {
  [FlashCardType.WELCOME]: 0,
  [FlashCardType.GASTRONOMY]: 1,
  [FlashCardType.FLORA_FAUNA]: 2,
  [FlashCardType.ENVIRONMENTAL]: 3,
  [FlashCardType.CURIOUS_FACT]: 4,
  [FlashCardType.VOCABULARY]: 5,
};

export type FlashCardSortableField =
  (typeof FLASH_CARD_SORTABLE_FIELDS)[number];

export interface FindFlashCardsParams {
  page: number;
  limit: number;
  search?: string;
  protectedAreaId: string;
  type?: FlashCardType;
  sortField: FlashCardSortableField;
  sortOrder: 'asc' | 'desc';
}

export interface CreateFlashCardData {
  protectedAreaId: string;
  type: FlashCardType;
  title: string;
  content: string;
  image?: string;
  order: number;
  question?: string;
  options?: string[];
  correctAnswer?: string;
}

export interface UpdateFlashCardData {
  type?: FlashCardType;
  title?: string;
  content?: string;
  image?: string;
  order?: number;
  question?: string;
  options?: string[];
  correctAnswer?: string;
}
