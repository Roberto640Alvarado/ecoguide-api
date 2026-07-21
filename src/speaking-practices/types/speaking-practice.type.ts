export interface CreateSpeakingPracticeData {
  protectedAreaId: string;
  title: string;
  instructions: string;
  providerId: string;
  model: string;
  prompt: string;
  isActive?: boolean;
}

export interface UpdateSpeakingPracticeData {
  title?: string;
  instructions?: string;
  providerId?: string;
  model?: string;
  prompt?: string;
  isActive?: boolean;
}
