export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  replyToMessageId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
