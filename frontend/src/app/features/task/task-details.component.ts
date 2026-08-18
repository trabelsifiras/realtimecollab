import { Component, Input, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Subject, Observable, takeUntil } from 'rxjs';
import { TaskService } from '../../core/services/task.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { ProjectService } from '../../core/services/project.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { AuthService } from '../../core/services/auth.service';
import {
  Task,
  TaskActivity,
  TaskAttachment,
  TaskLink,
  TaskLinkType,
  TaskPriority,
  TaskStatus,
  TaskType
} from '../../core/models/task.model';
import { Comment } from '../../core/models/comment.model';
import { Project } from '../../core/models/project.model';
import { WorkspaceMember } from '../../core/models/workspace.model';
import { REALTIME_EVENT_TYPES } from '../../core/models/realtime.model';
import { avatarColor, initials } from '../../shared/utils/avatar.util';
import {
  ACTIVITY_FIELD_LABELS,
  LINK_TYPE_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TASK_LINK_TYPES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  TYPE_COLORS,
  TYPE_ICONS,
  TYPE_LABELS
} from './task.constants';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    NgFor,
    NgIf,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatAutocompleteModule
  ],
  templateUrl: './task-details.component.html',
  styleUrl: './task-details.component.css'
})
export class TaskDetailsComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;
  @Input() taskId!: string;

  private readonly taskService = inject(TaskService);
  private readonly projectService = inject(ProjectService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly realtime = inject(RealtimeService);
  private readonly auth = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  readonly TYPE_COLORS = TYPE_COLORS;
  readonly TYPE_ICONS = TYPE_ICONS;
  readonly TYPE_LABELS = TYPE_LABELS;
  readonly PRIORITY_COLORS = PRIORITY_COLORS;
  readonly PRIORITY_LABELS = PRIORITY_LABELS;
  readonly STATUS_COLORS = STATUS_COLORS;
  readonly STATUS_LABELS = STATUS_LABELS;
  readonly LINK_TYPE_LABELS = LINK_TYPE_LABELS;
  readonly TASK_STATUSES = TASK_STATUSES;
  readonly TASK_PRIORITIES = TASK_PRIORITIES;
  readonly TASK_TYPES = TASK_TYPES;
  readonly TASK_LINK_TYPES = TASK_LINK_TYPES;
  readonly avatarColor = avatarColor;

  task: Task | null = null;
  project: Project | null = null;
  members: WorkspaceMember[] = [];
  allTasks: Task[] = [];
  epics: Task[] = [];
  comments: Comment[] = [];
  activities: TaskActivity[] = [];
  subtasks: Task[] = [];
  attachments: TaskAttachment[] = [];
  links: TaskLink[] = [];

  editingDescription = false;
  descriptionDraft = '';
  newComment = '';
  newLabel = '';
  newSubtaskTitle = '';
  logMinutes: number | null = null;
  startDateInput = '';
  dueDateInput = '';
  linkQuery = '';
  newLinkType: TaskLinkType = 'RELATES_TO';
  selectedLinkTarget: Task | null = null;
  uploading = false;
  conflict = false;

  get linkOptions(): Task[] {
    const query = this.linkQuery.trim().toLowerCase();
    return this.allTasks
      .filter((t) => t.id !== this.taskId)
      .filter((t) => !query || t.title.toLowerCase().includes(query) || t.key.toLowerCase().includes(query))
      .slice(0, 8);
  }

  ngOnInit(): void {
    this.load();
    this.loadComments();
    this.loadActivity();
    this.loadSubtasks();
    this.loadAttachments();
    this.loadLinks();
    this.loadContext();
    this.realtime.subscribeToTask(this.taskId);

    this.realtime
      .events()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        const isComment =
          event.type === REALTIME_EVENT_TYPES.COMMENT_CREATED ||
          event.type === REALTIME_EVENT_TYPES.COMMENT_UPDATED ||
          event.type === REALTIME_EVENT_TYPES.COMMENT_DELETED;
        if (event.resourceId === this.taskId) {
          if (isComment) {
            this.loadComments();
          } else if (event.type !== REALTIME_EVENT_TYPES.TASK_DELETED) {
            this.load();
            this.loadActivity();
          }
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadContext(): void {
    this.taskService.get(this.taskId).subscribe((task) => {
      this.projectService.get(task.projectId).subscribe((project) => {
        this.project = project;
        this.workspaceService.listMembers(project.workspaceId).subscribe((members) => (this.members = members));
      });
      this.taskService.list(task.projectId, { size: 200 }).subscribe((page) => {
        this.allTasks = page.content;
        this.epics = this.allTasks.filter((t) => t.type === 'EPIC');
      });
    });
  }

  load(): void {
    this.taskService.get(this.taskId).subscribe((task) => {
      this.task = task;
      this.syncDateInputs();
    });
  }

  loadComments(): void {
    this.taskService.listComments(this.taskId).subscribe((comments) => (this.comments = comments));
  }

  loadActivity(): void {
    this.taskService.listActivities(this.taskId).subscribe((activities) => (this.activities = activities));
  }

  loadSubtasks(): void {
    this.taskService.listSubtasks(this.taskId).subscribe((subtasks) => (this.subtasks = subtasks));
  }

  loadAttachments(): void {
    this.taskService.listAttachments(this.taskId).subscribe((attachments) => (this.attachments = attachments));
  }

  loadLinks(): void {
    this.taskService.listLinks(this.taskId).subscribe((links) => (this.links = links));
  }

  private syncDateInputs(): void {
    this.startDateInput = this.toDateInput(this.task?.startDate);
    this.dueDateInput = this.toDateInput(this.task?.dueDate);
  }

  private apply(action: Observable<Task>): void {
    action.subscribe({
      next: (task) => {
        this.task = task;
        this.conflict = false;
        this.syncDateInputs();
        this.loadActivity();
      },
      error: () => this.handleConflict()
    });
  }

  updateStatus(status: TaskStatus): void {
    if (!this.task) return;
    this.apply(this.taskService.updateStatus(this.taskId, status, this.task.version));
  }

  updatePriority(priority: TaskPriority): void {
    if (!this.task) return;
    this.apply(this.taskService.update(this.taskId, { priority, version: this.task.version }));
  }

  updateType(type: TaskType): void {
    if (!this.task) return;
    this.apply(this.taskService.update(this.taskId, { type, version: this.task.version }));
  }

  updateAssignee(assigneeId: string | null): void {
    if (!this.task) return;
    this.apply(this.taskService.updateAssignee(this.taskId, assigneeId, this.task.version));
  }

  updateStoryPoints(event: Event): void {
    if (!this.task) return;
    const value = (event.target as HTMLInputElement).value;
    this.apply(this.taskService.update(this.taskId, { storyPoints: value === '' ? 0 : Number(value), version: this.task.version }));
  }

  updateEpic(epicId: string | null): void {
    if (!this.task) return;
    this.apply(this.taskService.setEpic(this.taskId, epicId, this.task.version));
  }

  saveSchedule(): void {
    if (!this.task) return;
    this.apply(
      this.taskService.updateDates(
        this.taskId,
        this.fromDateInput(this.startDateInput),
        this.fromDateInput(this.dueDateInput),
        this.task.version
      )
    );
  }

  updateEstimate(field: 'original' | 'remaining', event: Event): void {
    if (!this.task) return;
    const value = (event.target as HTMLInputElement).value;
    const patch = field === 'original'
      ? { originalEstimateMinutes: value === '' ? 0 : Number(value) }
      : { remainingEstimateMinutes: value === '' ? 0 : Number(value) };
    this.apply(this.taskService.update(this.taskId, { ...patch, version: this.task.version }));
  }

  logTime(): void {
    if (!this.task || !this.logMinutes) return;
    this.apply(this.taskService.logTime(this.taskId, this.logMinutes, this.task.version));
    this.logMinutes = null;
  }

  startEditDescription(): void {
    this.descriptionDraft = this.task?.description ?? '';
    this.editingDescription = true;
  }

  cancelEditDescription(): void {
    this.editingDescription = false;
  }

  saveDescription(): void {
    if (!this.task) return;
    this.editingDescription = false;
    this.apply(this.taskService.update(this.taskId, { description: this.descriptionDraft, version: this.task.version }));
  }

  addLabel(): void {
    const label = this.newLabel.trim();
    if (!label) return;
    this.newLabel = '';
    this.apply(this.taskService.addLabel(this.taskId, label));
  }

  removeLabel(label: string): void {
    this.apply(this.taskService.removeLabel(this.taskId, label));
  }

  toggleWatch(): void {
    if (!this.task) return;
    const me = this.auth.currentUser()?.id;
    if (!me) return;
    if (this.task.watchers.includes(me)) {
      this.apply(this.taskService.removeWatcher(this.taskId, me));
    } else {
      this.apply(this.taskService.addWatcher(this.taskId, me));
    }
  }

  isWatching(): boolean {
    const me = this.auth.currentUser()?.id;
    return !!me && !!this.task?.watchers.includes(me);
  }

  addComment(): void {
    const content = this.newComment.trim();
    if (!content) return;
    this.taskService.addComment(this.taskId, content).subscribe(() => {
      this.newComment = '';
      this.loadComments();
    });
  }

  addSubtask(): void {
    const title = this.newSubtaskTitle.trim();
    if (!title || !this.task) return;
    this.taskService.create(this.task.projectId, { title, type: 'SUBTASK', parentId: this.taskId }).subscribe(() => {
      this.newSubtaskTitle = '';
      this.loadSubtasks();
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading = true;
    this.taskService.uploadAttachment(this.taskId, file).subscribe({
      next: () => {
        this.uploading = false;
        this.loadAttachments();
        this.loadActivity();
      },
      error: () => (this.uploading = false)
    });
    input.value = '';
  }

  downloadAttachment(att: TaskAttachment): void {
    this.taskService.downloadAttachment(att.id, att.fileName);
  }

  deleteAttachment(att: TaskAttachment): void {
    this.taskService.deleteAttachment(att.id).subscribe(() => {
      this.loadAttachments();
      this.loadActivity();
    });
  }

  onLinkSelected(event: { option: { value: Task } }): void {
    this.selectedLinkTarget = event.option.value;
  }

  addLink(): void {
    if (!this.selectedLinkTarget) return;
    this.taskService.addLink(this.taskId, this.newLinkType, this.selectedLinkTarget.id).subscribe(() => {
      this.linkQuery = '';
      this.selectedLinkTarget = null;
      this.loadLinks();
      this.loadActivity();
    });
  }

  removeLink(link: TaskLink): void {
    this.taskService.removeLink(this.taskId, link.id).subscribe(() => {
      this.loadLinks();
      this.loadActivity();
    });
  }

  private handleConflict(): void {
    this.conflict = true;
    setTimeout(() => {
      this.load();
      this.conflict = false;
    }, 1000);
  }

  memberName(member: WorkspaceMember): string {
    const user = member.user;
    if (!user) return 'Unknown';
    return user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username;
  }

  actorName(userId: string): string {
    return this.members.find((m) => m.userId === userId)?.user?.username ?? 'User';
  }

  actorInitials(userId: string): string {
    const member = this.members.find((m) => m.userId === userId);
    const name = member?.user
      ? `${member.user.firstName ?? ''} ${member.user.lastName ?? member.user.username}`.trim()
      : userId;
    return initials(name);
  }

  activityText(a: TaskActivity): string {
    const fieldLabel = a.field ? ACTIVITY_FIELD_LABELS[a.field] ?? a.field : null;
    switch (a.type) {
      case 'CREATED':
        return 'created this task';
      case 'STATUS_CHANGED':
        return `changed status from ${this.enumLabel(a.oldValue)} to ${this.enumLabel(a.newValue)}`;
      case 'PRIORITY_CHANGED':
        return `changed priority from ${this.enumLabel(a.oldValue)} to ${this.enumLabel(a.newValue)}`;
      case 'ASSIGNEE_CHANGED':
        return `changed assignee from ${this.personLabel(a.oldValue)} to ${this.personLabel(a.newValue)}`;
      case 'FIELD_UPDATED':
        return `updated ${fieldLabel}${this.valueSuffix(a.field, a.oldValue, a.newValue)}`;
      case 'LABEL_ADDED':
        return `added label "${a.field}"`;
      case 'LABEL_REMOVED':
        return `removed label "${a.field}"`;
      case 'WATCHER_ADDED':
        return `added watcher ${this.personLabel(a.newValue)}`;
      case 'WATCHER_REMOVED':
        return `removed watcher ${this.personLabel(a.oldValue)}`;
      case 'ATTACHMENT_ADDED':
        return `attached "${a.field}"`;
      case 'ATTACHMENT_REMOVED':
        return `removed attachment "${a.field}"`;
      case 'LINK_ADDED':
        return `linked issue ${a.newValue ?? ''} (${(a.field ?? '').toLowerCase().replace(/_/g, ' ')})`;
      case 'LINK_REMOVED':
        return `removed link (${(a.field ?? '').toLowerCase().replace(/_/g, ' ')})`;
      default:
        return 'updated this task';
    }
  }

  private valueSuffix(field: string | undefined, oldValue: string | undefined, newValue: string | undefined): string {
    if (oldValue == null && newValue == null) return '';
    if (field === 'storyPoints' || field === 'originalEstimateMinutes' || field === 'remainingEstimateMinutes') {
      return ` to ${newValue ?? '—'}`;
    }
    if (field === 'startDate' || field === 'dueDate') {
      return newValue ? ` to ${new Date(newValue).toLocaleDateString()}` : ' cleared';
    }
    if (field === 'title' || field === 'description' || field === 'type') {
      return '';
    }
    return ` from ${this.displayValue(oldValue)} to ${this.displayValue(newValue)}`;
  }

  private displayValue(value: string | undefined): string {
    if (!value || value === 'null') return '—';
    return value;
  }

  private enumLabel(value: string | undefined): string {
    if (!value) return '—';
    return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private personLabel(value: string | undefined): string {
    if (!value) return 'Unassigned';
    return this.actorName(value);
  }

  formatMinutes(minutes: number | undefined): string {
    if (minutes == null) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  }

  formatBytes(bytes: number | undefined): string {
    if (bytes == null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private toDateInput(iso: string | undefined): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
  }

  private fromDateInput(value: string): string | null {
    if (!value) return null;
    return new Date(`${value}T00:00:00.000Z`).toISOString();
  }
}
