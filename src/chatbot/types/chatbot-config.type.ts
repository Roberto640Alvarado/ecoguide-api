export interface CreateChatbotConfigData {
  protectedAreaId: string;
  providerId: string;
  model: string;
  systemPrompt: string;
  welcomeMessage: string;
  temperature?: number;
  maxTokens?: number;
  isActive?: boolean;
}

export interface UpdateChatbotConfigData {
  providerId?: string;
  model?: string;
  systemPrompt?: string;
  welcomeMessage?: string;
  temperature?: number;
  maxTokens?: number;
  isActive?: boolean;
}
