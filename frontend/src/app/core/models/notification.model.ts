export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_UPDATED'
  | 'COMMENT_ADDED'
  | 'MENTION'
  | 'CHANNEL_MESSAGE'
  | 'WORKSPACE_INVITATION'
  | 'PROJECT_INVITATION'
  | 'SYSTEM';

export interface Notification {
  id: string;
  type: NotificationType;
  title?: string;
  message?: string;
  resourceType?: string;
  resourceId?: string;
  read: boolean;
  createdAt: string;
}
