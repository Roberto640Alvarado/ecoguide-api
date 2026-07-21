export interface QuestionData {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  score: number;
}

export interface CreateTestData {
  protectedAreaId: string;
  title: string;
  description: string;
  maxAttempts: number;
  passingScore: number;
  questions: QuestionData[];
  isActive?: boolean;
}

export interface UpdateTestData {
  title?: string;
  description?: string;
  maxAttempts?: number;
  passingScore?: number;
  questions?: QuestionData[];
  isActive?: boolean;
}
