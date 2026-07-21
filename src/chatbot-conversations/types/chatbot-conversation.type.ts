export type MessageRole = 'user' | 'assistant';

export interface MessageData {
  id: string;
  role: MessageRole;
  message: string;
  createdAt: Date;
}

export interface CreateConversationData {
  studentId: string;
  protectedAreaId: string;
  messages: MessageData[];
}

export const CHATBOT_CONVERSATION_SORTABLE_FIELDS = ['startedAt'] as const;
export type ChatbotConversationSortableField =
  (typeof CHATBOT_CONVERSATION_SORTABLE_FIELDS)[number];

export interface FindConversationsParams {
  page: number;
  limit: number;
  sortField: ChatbotConversationSortableField;
  sortOrder: 'asc' | 'desc';
}
