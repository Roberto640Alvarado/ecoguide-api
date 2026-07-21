export interface AnswerData {
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
}

export interface CreateStudentTestData {
  studentId: string;
  protectedAreaId: string;
  testId: string;
  attempt: number;
  score: number;
  answers: AnswerData[];
}

export const STUDENT_TEST_SORTABLE_FIELDS = [
  'createdAt',
  'attempt',
  'score',
] as const;
export type StudentTestSortableField =
  (typeof STUDENT_TEST_SORTABLE_FIELDS)[number];

export interface FindStudentTestsParams {
  page: number;
  limit: number;
  sortField: StudentTestSortableField;
  sortOrder: 'asc' | 'desc';
}
