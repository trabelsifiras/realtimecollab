import { TaskLinkType, TaskPriority, TaskStatus, TaskType } from '../../core/models/task.model';

export const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: '#6b778c',
  IN_PROGRESS: '#0052cc',
  IN_REVIEW: '#7c3aed',
  BLOCKED: '#e01e5a',
  DONE: '#00875a'
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: '#8a9099',
  MEDIUM: '#36c5f0',
  HIGH: '#ecb22e',
  URGENT: '#e01e5a'
};

export const TYPE_COLORS: Record<TaskType, string> = {
  EPIC: '#7c3aed',
  STORY: '#00a6a6',
  TASK: '#0052cc',
  BUG: '#e01e5a',
  SUBTASK: '#6b778c'
};

export const TYPE_ICONS: Record<TaskType, string> = {
  EPIC: 'bolt',
  STORY: 'bookmark',
  TASK: 'task_alt',
  BUG: 'bug_report',
  SUBTASK: 'subdirectory_arrow_right'
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  BLOCKED: 'Blocked',
  DONE: 'Done'
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent'
};

export const TYPE_LABELS: Record<TaskType, string> = {
  EPIC: 'Epic',
  STORY: 'Story',
  TASK: 'Task',
  BUG: 'Bug',
  SUBTASK: 'Sub-task'
};

export const LINK_TYPE_LABELS: Record<TaskLinkType, string> = {
  BLOCKS: 'blocks',
  RELATES_TO: 'relates to',
  DUPLICATES: 'duplicates',
  CLONES: 'clones'
};

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'];
export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const TASK_TYPES: TaskType[] = ['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK'];
export const TASK_LINK_TYPES: TaskLinkType[] = ['BLOCKS', 'RELATES_TO', 'DUPLICATES', 'CLONES'];

/** Fields whose activity entries render as human-readable "from X to Y". */
export const ACTIVITY_FIELD_LABELS: Record<string, string> = {
  title: 'Summary',
  description: 'Description',
  type: 'Type',
  storyPoints: 'Story points',
  startDate: 'Start date',
  dueDate: 'Due date',
  originalEstimateMinutes: 'Original estimate',
  remainingEstimateMinutes: 'Remaining estimate',
  loggedMinutes: 'Time logged',
  parent: 'Parent',
  epic: 'Epic',
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee'
};
