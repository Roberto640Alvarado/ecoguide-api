export const AI_PROVIDER_SORTABLE_FIELDS = [
  'providerName',
  'createdAt',
] as const;

export type AIProviderSortableField =
  (typeof AI_PROVIDER_SORTABLE_FIELDS)[number];

export interface FindAIProvidersParams {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortField: AIProviderSortableField;
  sortOrder: 'asc' | 'desc';
}

export interface ModelData {
  id: string;
  name: string;
  model: string;
  isActive: boolean;
}

export interface CreateAIProviderData {
  providerName: string;
  apiKeyEncrypted: string;
  isActive?: boolean;
  models?: ModelData[];
}

export interface UpdateAIProviderData {
  providerName?: string;
  apiKeyEncrypted?: string;
  isActive?: boolean;
}

export interface UpdateModelData {
  name?: string;
  model?: string;
  isActive?: boolean;
}
