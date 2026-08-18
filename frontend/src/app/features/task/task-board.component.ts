import { Component, Input, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgFor, NgIf, NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CdkDragDrop, CdkDropList, CdkDrag } from '@angular/cdk/drag-drop';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { TaskService } from '../../core/services/task.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { ProjectService } from '../../core/services/project.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { Task, TaskPriority, TaskStatus, TaskType } from '../../core/models/task.model';
import { Project } from '../../core/models/project.model';
import { WorkspaceMember } from '../../core/models/workspace.model';
import { REALTIME_EVENT_TYPES } from '../../core/models/realtime.model';
import { avatarColor, initials } from '../../shared/utils/avatar.util';
import {
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  TYPE_COLORS,
  TYPE_ICONS,
  TYPE_LABELS
} from './task.constants';

interface Column {
  status: TaskStatus;
  title: string;
  color: string;
  tasks: Task[];
}

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    NgFor,
    NgIf,
    NgClass,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    CdkDropList,
    CdkDrag
  ],
  templateUrl: './task-board.component.html',
  styleUrl: './task-board.component.css'
})
export class TaskBoardComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;

  private readonly taskService = inject(TaskService);
  private readonly projectService = inject(ProjectService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly realtime = inject(RealtimeService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  readonly PRIORITY_COLORS = PRIORITY_COLORS;
  readonly PRIORITY_LABELS = PRIORITY_LABELS;
  readonly STATUS_COLORS = STATUS_COLORS;
  readonly STATUS_LABELS = STATUS_LABELS;
  readonly TYPE_COLORS = TYPE_COLORS;
  readonly TYPE_ICONS = TYPE_ICONS;
  readonly TYPE_LABELS = TYPE_LABELS;
  readonly TASK_STATUSES = TASK_STATUSES;
  readonly TASK_PRIORITIES = TASK_PRIORITIES;
  readonly TASK_TYPES = TASK_TYPES;
  readonly avatarColor = avatarColor;
  readonly initials = initials;

  project: Project | null = null;
  members: WorkspaceMember[] = [];
  tasks: Task[] = [];
  columns: Column[] = [];
  loading = false;

  newTaskTitle = '';
  newTaskType: TaskType = 'TASK';
  newTaskPriority: TaskPriority = 'MEDIUM';

  search = '';
  filterAssignee: string | null = null;
  filterType: TaskType | null = null;
  filterPriority: TaskPriority | null = null;

  get hasFilters(): boolean {
    return !!(this.search || this.filterAssignee || this.filterType || this.filterPriority);
  }

  ngOnInit(): void {
    this.projectService.get(this.projectId).subscribe((project) => {
      this.project = project;
      this.workspaceService.listMembers(project.workspaceId).subscribe((members) => (this.members = members));
    });

    this.search$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.load());

    this.load();
    this.realtime.subscribeToProject(this.projectId);

    this.realtime
      .events()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event.projectId === this.projectId && this.isTaskEvent(event.type)) {
          this.load();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.taskService
      .list(this.projectId, {
        size: 200,
        query: this.search || undefined,
        assigneeId: this.filterAssignee ?? undefined,
        type: this.filterType ?? undefined,
        priority: this.filterPriority ?? undefined
      })
      .subscribe((page) => {
        this.tasks = page.content;
        this.buildColumns();
        this.loading = false;
      });
  }

  onSearchChange(value: string): void {
    this.search = value;
    this.search$.next(value);
  }

  clearFilters(): void {
    this.search = '';
    this.filterAssignee = null;
    this.filterType = null;
    this.filterPriority = null;
    this.load();
  }

  createTask(): void {
    const title = this.newTaskTitle.trim();
    if (!title) return;
    this.taskService.create(this.projectId, { title, type: this.newTaskType, priority: this.newTaskPriority }).subscribe(() => {
      this.newTaskTitle = '';
      this.load();
    });
  }

  drop(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus): void {
    const task = event.item.data as Task;
    if (task.status === targetStatus) return;
    this.taskService.updateStatus(task.id, targetStatus, task.version).subscribe({
      next: () => this.load(),
      error: () => this.load()
    });
  }

  move(task: Task, status: TaskStatus): void {
    this.taskService.updateStatus(task.id, status, task.version).subscribe({
      next: () => this.load(),
      error: () => this.load()
    });
  }

  deleteTask(task: Task): void {
    this.taskService.delete(task.id).subscribe(() => this.load());
  }

  openTask(id: string): void {
    void this.router.navigate(['/projects', this.projectId, 'tasks', id]);
  }

  isOverdue(task: Task): boolean {
    return !!task.dueDate && task.status !== 'DONE' && new Date(task.dueDate) < new Date();
  }

  memberName(member: WorkspaceMember): string {
    const user = member.user;
    if (!user) return 'Unknown';
    return user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username;
  }

  memberNameById(userId: string): string {
    return this.members.find((m) => m.userId === userId)?.user?.username ?? 'Assignee';
  }

  memberColor(userId: string): string {
    return avatarColor(userId);
  }

  memberInitials(userId: string): string {
    const member = this.members.find((m) => m.userId === userId);
    const name = member?.user ? `${member.user.firstName ?? ''} ${member.user.lastName ?? member.user.username}`.trim() : userId;
    return initials(name);
  }

  private buildColumns(): void {
    this.columns = TASK_STATUSES.map((status) => ({
      status,
      title: STATUS_LABELS[status],
      color: STATUS_COLORS[status],
      tasks: this.tasks.filter((t) => t.status === status)
    }));
  }

  private isTaskEvent(type: string): boolean {
    return (
      type === REALTIME_EVENT_TYPES.TASK_CREATED ||
      type === REALTIME_EVENT_TYPES.TASK_UPDATED ||
      type === REALTIME_EVENT_TYPES.TASK_STATUS_CHANGED ||
      type === REALTIME_EVENT_TYPES.TASK_ASSIGNED ||
      type === REALTIME_EVENT_TYPES.TASK_DELETED
    );
  }
}
