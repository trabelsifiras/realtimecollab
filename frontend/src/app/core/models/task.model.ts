export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskType = 'EPIC' | 'STORY' | 'TASK' | 'BUG' | 'SUBTASK';
export type TaskLinkType = 'BLOCKS' | 'RELATES_TO' | 'DUPLICATES' | 'CLONES';

export type TaskActivityType =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'PRIORITY_CHANGED'
  | 'ASSIGNEE_CHANGED'
  | 'FIELD_UPDATED'
  | 'LABEL_ADDED'
  | 'LABEL_REMOVED'
  | 'WATCHER_ADDED'
  | 'WATCHER_REMOVED'
  | 'ATTACHMENT_ADDED'
  | 'ATTACHMENT_REMOVED'
  | 'LINK_ADDED'
  | 'LINK_REMOVED';

export interface Task {
  id: string;
  key: string;
  projectId: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  creatorId: string;
  parentId?: string;
  epicId?: string;
  storyPoints?: number;
  labels: string[];
  watchers: string[];
  startDate?: string;
  dueDate?: string;
  originalEstimateMinutes?: number;
  remainingEstimateMinutes?: number;
  loggedMinutes?: number;
  position?: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  actorId: string;
  type: TaskActivityType;
  field?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  uploaderId: string;
  fileName: string;
  contentType?: string;
  sizeBytes: number;
  createdAt: string;
}

export interface TaskLink {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  linkType: TaskLinkType;
  inbound: boolean;
  targetKey?: string;
  targetTitle?: string;
  targetStatus?: { value: string };
  createdAt: string;
}

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  type?: TaskType;
  assigneeId?: string;
  creatorId?: string;
  parentId?: string;
  epicId?: string;
  watcherId?: string;
  labels?: string[];
  query?: string;
  page?: number;
  size?: number;
  sort?: string;
}
