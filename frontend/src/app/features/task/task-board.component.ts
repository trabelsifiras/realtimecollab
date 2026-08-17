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
  template: `
    <div class="board-page">
      <header class="board-header">
        <div class="board-title">
          <button mat-icon-button routerLink="/workspaces/{{ project?.workspaceId }}/projects" class="back-btn" aria-label="Back to projects">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <div class="crumb">Projects / {{ project?.name ?? '…' }}</div>
            <h1>{{ project?.name ?? 'Board' }}</h1>
          </div>
        </div>

        <form class="new-task" (ngSubmit)="createTask()">
          <mat-form-field appearance="outline" class="new-title">
            <mat-icon matPrefix>add</mat-icon>
            <input matInput [(ngModel)]="newTaskTitle" name="newTaskTitle" placeholder="Create new task…" aria-label="New task title" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="new-select">
            <mat-select [(ngModel)]="newTaskType" name="newTaskType" aria-label="New task type">
              <mat-option *ngFor="let t of TASK_TYPES" [value]="t">{{ TYPE_LABELS[t] }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="new-select">
            <mat-select [(ngModel)]="newTaskPriority" name="newTaskPriority" aria-label="New task priority">
              <mat-option *ngFor="let p of TASK_PRIORITIES" [value]="p">{{ PRIORITY_LABELS[p] }}</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-raised-button color="primary" type="submit" [disabled]="!newTaskTitle.trim()">Add</button>
        </form>
      </header>

      <div class="filters" role="search">
        <mat-form-field appearance="outline" class="search">
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [(ngModel)]="search" (ngModelChange)="onSearchChange($event)" name="search" placeholder="Search tasks…" aria-label="Search tasks" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter">
          <mat-label>Assignee</mat-label>
          <mat-select [(ngModel)]="filterAssignee" (ngModelChange)="load()" name="filterAssignee" aria-label="Filter by assignee">
            <mat-option [value]="null">All</mat-option>
            <mat-option *ngFor="let m of members" [value]="m.userId">{{ memberName(m) }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter">
          <mat-label>Type</mat-label>
          <mat-select [(ngModel)]="filterType" (ngModelChange)="load()" name="filterType" aria-label="Filter by type">
            <mat-option [value]="null">All</mat-option>
            <mat-option *ngFor="let t of TASK_TYPES" [value]="t">{{ TYPE_LABELS[t] }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="filter">
          <mat-label>Priority</mat-label>
          <mat-select [(ngModel)]="filterPriority" (ngModelChange)="load()" name="filterPriority" aria-label="Filter by priority">
            <mat-option [value]="null">All</mat-option>
            <mat-option *ngFor="let p of TASK_PRIORITIES" [value]="p">{{ PRIORITY_LABELS[p] }}</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-button *ngIf="hasFilters" (click)="clearFilters()" class="clear">Clear</button>
      </div>

      <div class="board" cdkDropListGroup [class.loading]="loading">
        <section *ngFor="let column of columns" class="column" [attr.aria-label]="column.title + ' column'">
          <div class="column-header">
            <span class="status-dot" [style.background]="column.color"></span>
            <span class="column-title">{{ column.title }}</span>
            <span class="count" [attr.aria-label]="column.tasks.length + ' tasks'">{{ column.tasks.length }}</span>
          </div>
          <div class="cards" cdkDropList [cdkDropListData]="column.tasks" (cdkDropListDropped)="drop($event, column.status)">
            <div
              *ngFor="let task of column.tasks"
              class="task-card"
              cdkDrag
              [cdkDragData]="task"
            >
              <div class="task-top">
                <span class="key">
                  <mat-icon class="type-icon" [style.color]="TYPE_COLORS[task.type]" [attr.aria-label]="TYPE_LABELS[task.type]">{{ TYPE_ICONS[task.type] }}</mat-icon>
                  {{ task.key }}
                </span>
                <button mat-icon-button [matMenuTriggerFor]="menu" class="more" [attr.aria-label]="'Task actions for ' + task.title" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
              </div>
              <button class="task-title" (click)="openTask(task.id)">{{ task.title }}</button>

              <div *ngIf="task.labels?.length" class="labels">
                <span *ngFor="let label of task.labels" class="label">{{ label }}</span>
              </div>

              <div class="task-footer">
                <div class="meta">
                  <span *ngIf="task.storyPoints != null" class="sp" [matTooltip]="task.storyPoints + ' story points'">{{ task.storyPoints }}</span>
                  <span *ngIf="task.priority" class="priority" [style.background]="PRIORITY_COLORS[task.priority] + '22'" [style.color]="PRIORITY_COLORS[task.priority]">
                    {{ PRIORITY_LABELS[task.priority] }}
                  </span>
                  <span *ngIf="task.dueDate" class="due" [class.overdue]="isOverdue(task)" [matTooltip]="'Due ' + (task.dueDate | date: 'mediumDate')">
                    <mat-icon>schedule</mat-icon>{{ task.dueDate | date: 'MMM d' }}
                  </span>
                </div>
                <div class="people">
                  <span *ngIf="task.assigneeId" class="assignee" [style.background]="memberColor(task.assigneeId)" [matTooltip]="memberNameById(task.assigneeId)">
                    {{ memberInitials(task.assigneeId) }}
                  </span>
                  <span *ngIf="task.watchers?.length" class="watchers" [matTooltip]="task.watchers.length + ' watchers'">
                    <mat-icon>visibility</mat-icon>{{ task.watchers.length }}
                  </span>
                </div>
              </div>

              <mat-menu #menu="matMenu">
                <button mat-menu-item *ngFor="let s of TASK_STATUSES" (click)="move(task, s)">
                  <mat-icon [style.color]="STATUS_COLORS[s]">check_circle</mat-icon> Move to {{ STATUS_LABELS[s] }}
                </button>
                <button mat-menu-item class="danger" (click)="deleteTask(task)">
                  <mat-icon>delete</mat-icon> Delete task
                </button>
              </mat-menu>
            </div>
            <div *ngIf="column.tasks.length === 0" class="drop-hint">Drop tasks here</div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      .board-page {
        padding: 24px;
        min-height: calc(100vh - 60px);
        display: flex;
        flex-direction: column;
      }

      .board-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 16px;
      }

      .board-title { display: flex; align-items: center; gap: 6px; }
      .back-btn { color: var(--text-muted); }
      .crumb { font-size: 0.75rem; color: var(--text-faint); font-weight: 500; }
      .board-title h1 { margin: 0; font-size: 1.4rem; }

      .new-task { display: flex; gap: 10px; align-items: flex-start; }
      .new-title { width: 280px; }
      .new-select { width: 130px; }

      .filters {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .search { width: 260px; }
      .filter { width: 160px; }
      .clear { color: var(--primary); font-weight: 600; }

      .board {
        display: flex;
        gap: 14px;
        align-items: flex-start;
        overflow-x: auto;
        padding-bottom: 16px;
        flex: 1;
      }
      .board.loading { opacity: 0.55; pointer-events: none; }

      .column {
        min-width: 280px;
        width: 280px;
        background: #eef0f3;
        border-radius: 12px;
        padding: 10px;
        flex-shrink: 0;
        max-height: calc(100vh - 260px);
        display: flex;
        flex-direction: column;
      }

      .column-header { display: flex; align-items: center; gap: 8px; padding: 4px 8px 10px; }
      .column-title {
        font-weight: 700;
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
        flex: 1;
      }
      .count {
        background: #d6d9dd;
        color: var(--text-muted);
        border-radius: 10px;
        font-size: 0.72rem;
        font-weight: 600;
        padding: 1px 8px;
      }

      .cards { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; min-height: 40px; padding-bottom: 4px; }

      .task-card {
        background: #fff;
        border-radius: 10px;
        padding: 12px;
        box-shadow: var(--shadow-xs);
        cursor: grab;
        border: 1px solid transparent;
        transition: box-shadow 0.15s ease, transform 0.15s ease;
      }
      .task-card:hover { box-shadow: var(--shadow); transform: translateY(-1px); }
      .task-card:active { cursor: grabbing; }

      .task-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
      .key {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--text-faint);
        letter-spacing: 0.02em;
      }
      .type-icon { font-size: 15px; width: 15px; height: 15px; }

      .more { width: 28px; height: 28px; line-height: 28px; opacity: 0; transition: opacity 0.12s ease; }
      .task-card:hover .more, .more:focus-visible { opacity: 1; }
      .more mat-icon { font-size: 18px; }

      .task-title {
        all: unset;
        display: block;
        cursor: pointer;
        width: 100%;
        text-align: left;
        font-weight: 600;
        font-size: 0.92rem;
        line-height: 1.35;
        color: var(--text);
      }
      .task-title:hover, .task-title:focus-visible { color: var(--primary); outline: none; }

      .labels { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
      .label {
        background: #f0eefd;
        color: #5a4bd1;
        font-size: 0.68rem;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 6px;
      }

      .task-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
      .meta { display: flex; align-items: center; gap: 8px; }
      .sp {
        min-width: 20px;
        height: 20px;
        border-radius: 10px;
        background: #e8f0fe;
        color: #0052cc;
        font-size: 0.68rem;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
      }
      .priority { font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; letter-spacing: 0.02em; }
      .due { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; color: var(--text-muted); }
      .due mat-icon { font-size: 14px; width: 14px; height: 14px; }
      .due.overdue { color: var(--danger); }

      .people { display: flex; align-items: center; gap: 6px; }
      .assignee {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        color: #fff;
        font-size: 0.6rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        text-transform: uppercase;
      }
      .watchers { display: inline-flex; align-items: center; gap: 3px; font-size: 0.7rem; color: var(--text-faint); }
      .watchers mat-icon { font-size: 14px; width: 14px; height: 14px; }

      .drop-hint {
        color: var(--text-faint);
        text-align: center;
        padding: 20px 0;
        border: 2px dashed #cdd1d6;
        border-radius: 8px;
        font-size: 0.8rem;
      }
      .danger { color: var(--danger); }

      @media (max-width: 640px) {
        .new-title, .new-select, .search, .filter { width: 100%; }
        .new-task { width: 100%; }
        .column { width: 260px; min-width: 260px; }
      }
    `
  ]
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
