export interface SpeakingSummary {
  attempts: number;
  finished: number;
  bestScore: number | null;
}

export interface ChatbotSummary {
  total: number;
  finished: number;
}

export interface TestSummary {
  attemptsUsed: number;
  bestScore: number | null;
}
