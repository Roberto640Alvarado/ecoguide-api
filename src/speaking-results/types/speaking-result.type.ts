export type SpeakingTurnRole = 'assistant' | 'user';

export interface SpeakingTurnData {
  id: string;
  role: SpeakingTurnRole;
  message: string;
  createdAt: Date;
}

export interface CreateSpeakingResultData {
  studentId: string;
  protectedAreaId: string;
  speakingPracticeId: string;
  turns: SpeakingTurnData[];
}

export const SPEAKING_RESULT_SORTABLE_FIELDS = ['startedAt'] as const;
export type SpeakingResultSortableField =
  (typeof SPEAKING_RESULT_SORTABLE_FIELDS)[number];

export interface FindSpeakingResultsParams {
  page: number;
  limit: number;
  sortField: SpeakingResultSortableField;
  sortOrder: 'asc' | 'desc';
}
