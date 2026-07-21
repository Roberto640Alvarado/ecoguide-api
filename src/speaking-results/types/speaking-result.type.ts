export const SPEAKING_RESULT_SORTABLE_FIELDS = ['createdAt', 'score'] as const;
export type SpeakingResultSortableField =
  (typeof SPEAKING_RESULT_SORTABLE_FIELDS)[number];

export interface CreateSpeakingResultData {
  studentId: string;
  protectedAreaId: string;
  speakingPracticeId: string;
  audioUrl: string;
  transcription: string;
  feedback: string;
  score: number;
}

export interface FindSpeakingResultsParams {
  page: number;
  limit: number;
  sortField: SpeakingResultSortableField;
  sortOrder: 'asc' | 'desc';
}
