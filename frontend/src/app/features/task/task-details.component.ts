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
  template: `
    <div class="page-container detail">
      <button mat-button class="back" routerLink="/projects/{{ projectId }}"><mat-icon>arrow_back</mat-icon> Board</button>

      <ng-container *ngIf="task">
        <div class="task-head">
          <span class="type-icon" [style.color]="TYPE_COLORS[task.type]" [matTooltip]="TYPE_LABELS[task.type]">{{ TYPE_ICONS[task.type] }}</span>
          <span class="key">{{ task.key }}</span>
          <h1>{{ task.title }}</h1>
          <span class="priority" [style.background]="PRIORITY_COLORS[task.priority] + '22'" [style.color]="PRIORITY_COLORS[task.priority]">{{ PRIORITY_LABELS[task.priority] }}</span>
        </div>

        <div class="layout">
          <div class="main-col">
            <section class="panel" aria-labelledby="description-title">
              <h2 id="description-title" class="panel-title">Description</h2>
              <ng-container *ngIf="!editingDescription; else editDesc">
                <p class="desc">{{ task.description ?? 'No description provided.' }}</p>
                <button mat-button class="edit-btn" (click)="startEditDescription()"><mat-icon>edit</mat-icon> Edit</button>
              </ng-container>
              <ng-template #editDesc>
                <mat-form-field appearance="outline" class="full-width">
                  <textarea matInput [(ngModel)]="descriptionDraft" name="description" rows="5" aria-label="Description"></textarea>
                </mat-form-field>
                <div class="edit-actions">
                  <button mat-button (click)="cancelEditDescription()">Cancel</button>
                  <button mat-raised-button color="primary" (click)="saveDescription()">Save</button>
                </div>
              </ng-template>
            </section>

            <section class="panel" *ngIf="task.type !== 'SUBTASK'" aria-labelledby="subtasks-title">
              <h2 id="subtasks-title" class="panel-title">Subtasks <span class="count">{{ subtasks.length }}</span></h2>
              <div *ngFor="let sub of subtasks" class="subtask">
                <mat-icon [style.color]="STATUS_COLORS[sub.status]" class="sub-status">{{ sub.status === 'DONE' ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                <a [routerLink]="['/projects', projectId, 'tasks', sub.id]">{{ sub.key }} · {{ sub.title }}</a>
                <span class="sub-meta">{{ TYPE_LABELS[sub.type] }}</span>
              </div>
              <div *ngIf="subtasks.length === 0" class="muted">No subtasks yet.</div>
              <form class="inline-form" (ngSubmit)="addSubtask()">
                <mat-form-field appearance="outline" class="full-width">
                  <input matInput [(ngModel)]="newSubtaskTitle" name="newSubtaskTitle" placeholder="Add a subtask…" aria-label="New subtask title" />
                </mat-form-field>
                <button mat-raised-button color="primary" type="submit" [disabled]="!newSubtaskTitle.trim()">Add</button>
              </form>
            </section>

            <section class="panel" aria-labelledby="activity-title">
              <h2 id="activity-title" class="panel-title">Activity</h2>
              <ol class="activity" *ngIf="activities.length; else noActivity">
                <li *ngFor="let a of activities" class="activity-item">
                  <span class="avatar" [style.background]="avatarColor(a.actorId)">{{ actorInitials(a.actorId) }}</span>
                  <div class="activity-body">
                    <div class="activity-text">{{ activityText(a) }}</div>
                    <div class="activity-time">{{ actorName(a.actorId) }} · {{ a.createdAt | date: 'MMM d, y, h:mm a' }}</div>
                  </div>
                </li>
              </ol>
              <ng-template #noActivity><div class="muted">No activity recorded.</div></ng-template>
            </section>

            <section class="panel" aria-labelledby="comments-title">
              <h2 id="comments-title" class="panel-title">Comments <span class="count">{{ comments.length }}</span></h2>
              <div class="comment-box">
                <textarea [(ngModel)]="newComment" name="comment" rows="2" placeholder="Add a comment…" aria-label="Add a comment" (keydown.control.enter)="addComment()"></textarea>
                <div class="comment-actions">
                  <span class="hint">Ctrl+Enter to send</span>
                  <button mat-raised-button color="primary" (click)="addComment()" [disabled]="!newComment.trim()">Comment</button>
                </div>
              </div>
              <div *ngFor="let c of comments" class="comment">
                <span class="avatar" [style.background]="avatarColor(c.authorId)">{{ actorInitials(c.authorId) }}</span>
                <div class="comment-body">
                  <div class="comment-content">{{ c.content }}</div>
                  <div class="comment-time">{{ actorName(c.authorId) }} · {{ c.createdAt | date: 'short' }}</div>
                </div>
              </div>
              <div *ngIf="comments.length === 0" class="muted">No comments yet.</div>
            </section>
          </div>

          <aside class="side-col" aria-label="Task details">
            <section class="panel">
              <h2 class="panel-title">Status</h2>
              <mat-form-field appearance="outline" class="full-width">
                <mat-select [ngModel]="task.status" (ngModelChange)="updateStatus($event)" aria-label="Status">
                  <mat-option *ngFor="let s of TASK_STATUSES" [value]="s">
                    <span class="status-option"><span class="status-dot" [style.background]="STATUS_COLORS[s]"></span>{{ STATUS_LABELS[s] }}</span>
                  </mat-option>
                </mat-select>
              </mat-form-field>
            </section>

            <section class="panel">
              <h2 class="panel-title">People</h2>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Assignee</mat-label>
                <mat-select [ngModel]="task.assigneeId ?? ''" (ngModelChange)="updateAssignee($event === '' ? null : $event)" aria-label="Assignee">
                  <mat-option [value]="">Unassigned</mat-option>
                  <mat-option *ngFor="let m of members" [value]="m.userId">{{ memberName(m) }}</mat-option>
                </mat-select>
              </mat-form-field>
              <div class="field-row">
                <mat-icon>person_outline</mat-icon>
                <span class="field-label">Reporter</span>
                <span class="field-value">{{ actorName(task.creatorId) }}</span>
              </div>
              <div class="field-row watchers-row">
                <mat-icon>visibility</mat-icon>
                <span class="field-label">Watchers</span>
                <span class="field-value">{{ task.watchers.length }}</span>
                <button mat-button class="watch-btn" (click)="toggleWatch()">{{ isWatching() ? 'Stop watching' : 'Watch' }}</button>
              </div>
              <div class="watcher-avatars" *ngIf="task.watchers.length">
                <span *ngFor="let w of task.watchers" class="avatar sm" [style.background]="avatarColor(w)" [matTooltip]="actorName(w)">{{ actorInitials(w) }}</span>
              </div>
            </section>

            <section class="panel">
              <h2 class="panel-title">Details</h2>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Type</mat-label>
                <mat-select [ngModel]="task.type" (ngModelChange)="updateType($event)" aria-label="Type">
                  <mat-option *ngFor="let t of TASK_TYPES" [value]="t">
                    <mat-icon class="type-option-icon" [style.color]="TYPE_COLORS[t]">{{ TYPE_ICONS[t] }}</mat-icon>{{ TYPE_LABELS[t] }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Priority</mat-label>
                <mat-select [ngModel]="task.priority" (ngModelChange)="updatePriority($event)" aria-label="Priority">
                  <mat-option *ngFor="let p of TASK_PRIORITIES" [value]="p">{{ PRIORITY_LABELS[p] }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Story points</mat-label>
                <input matInput type="number" min="0" [ngModel]="task.storyPoints ?? ''" (change)="updateStoryPoints($event)" aria-label="Story points" />
              </mat-form-field>
            </section>

            <section class="panel" *ngIf="epics.length || task.epicId">
              <h2 class="panel-title">Epic link</h2>
              <mat-form-field appearance="outline" class="full-width">
                <mat-select [ngModel]="task.epicId ?? ''" (ngModelChange)="updateEpic($event === '' ? null : $event)" aria-label="Epic link">
                  <mat-option [value]="">No epic</mat-option>
                  <mat-option *ngFor="let e of epics" [value]="e.id">{{ e.key }} · {{ e.title }}</mat-option>
                </mat-select>
              </mat-form-field>
            </section>

            <section class="panel">
              <h2 class="panel-title">Schedule</h2>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Start date</mat-label>
                <input matInput type="date" [(ngModel)]="startDateInput" name="startDate" (change)="saveSchedule()" aria-label="Start date" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Due date</mat-label>
                <input matInput type="date" [(ngModel)]="dueDateInput" name="dueDate" (change)="saveSchedule()" aria-label="Due date" />
              </mat-form-field>
            </section>

            <section class="panel">
              <h2 class="panel-title">Time tracking</h2>
              <div class="field-row">
                <span class="field-label">Original estimate</span>
                <input class="minutes-input" type="number" min="0" [ngModel]="task.originalEstimateMinutes ?? ''" (change)="updateEstimate('original', $event)" aria-label="Original estimate in minutes" />
                <span class="muted">{{ formatMinutes(task.originalEstimateMinutes) }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Remaining</span>
                <input class="minutes-input" type="number" min="0" [ngModel]="task.remainingEstimateMinutes ?? ''" (change)="updateEstimate('remaining', $event)" aria-label="Remaining estimate in minutes" />
                <span class="muted">{{ formatMinutes(task.remainingEstimateMinutes) }}</span>
              </div>
              <div class="field-row">
                <span class="field-label">Logged</span>
                <span class="field-value">{{ formatMinutes(task.loggedMinutes) }}</span>
              </div>
              <div class="log-time">
                <mat-form-field appearance="outline" class="log-input">
                  <mat-label>Log time (minutes)</mat-label>
                  <input matInput type="number" min="1" [(ngModel)]="logMinutes" name="logMinutes" aria-label="Minutes to log" />
                </mat-form-field>
                <button mat-raised-button color="primary" (click)="logTime()" [disabled]="!logMinutes">Log</button>
              </div>
            </section>

            <section class="panel">
              <h2 class="panel-title">Labels</h2>
              <div class="labels">
                <span *ngFor="let label of task.labels" class="label">
                  {{ label }}
                  <button mat-icon-button class="label-remove" (click)="removeLabel(label)" [attr.aria-label]="'Remove label ' + label"><mat-icon>close</mat-icon></button>
                </span>
                <span *ngIf="!task.labels?.length" class="muted">No labels.</span>
              </div>
              <form class="inline-form" (ngSubmit)="addLabel()">
                <mat-form-field appearance="outline" class="full-width">
                  <input matInput [(ngModel)]="newLabel" name="newLabel" placeholder="Add a label…" aria-label="New label" />
                </mat-form-field>
                <button mat-raised-button color="primary" type="submit" [disabled]="!newLabel.trim()">Add</button>
              </form>
            </section>

            <section class="panel">
              <h2 class="panel-title">Attachments</h2>
              <div *ngFor="let att of attachments" class="attachment">
                <mat-icon>attach_file</mat-icon>
                <div class="att-info">
                  <button class="att-name" (click)="downloadAttachment(att)">{{ att.fileName }}</button>
                  <div class="att-meta">{{ actorName(att.uploaderId) }} · {{ formatBytes(att.sizeBytes) }}</div>
                </div>
                <button mat-icon-button class="att-delete" (click)="deleteAttachment(att)" aria-label="Delete attachment"><mat-icon>delete_outline</mat-icon></button>
              </div>
              <div *ngIf="attachments.length === 0" class="muted">No attachments.</div>
              <div class="upload-row">
                <input #fileInput type="file" hidden (change)="onFileSelected($event)" aria-label="Choose file" />
                <button mat-stroked-button color="primary" (click)="fileInput.click()"><mat-icon>upload</mat-icon> Upload</button>
                <span *ngIf="uploading" class="muted">Uploading…</span>
              </div>
            </section>

            <section class="panel">
              <h2 class="panel-title">Linked issues</h2>
              <div *ngFor="let link of links" class="link">
                <mat-icon>link</mat-icon>
                <span class="link-type">{{ LINK_TYPE_LABELS[link.linkType] }}</span>
                <a *ngIf="link.targetKey" [routerLink]="['/projects', projectId, 'tasks', link.targetTaskId]">{{ link.targetKey }}</a>
                <button mat-icon-button class="att-delete" (click)="removeLink(link)" aria-label="Remove link"><mat-icon>close</mat-icon></button>
              </div>
              <div *ngIf="links.length === 0" class="muted">No linked issues.</div>
              <form class="inline-form" (ngSubmit)="addLink()">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Link to issue</mat-label>
                  <input matInput [matAutocomplete]="linkAuto" [(ngModel)]="linkQuery" name="linkQuery" placeholder="Search by key or title…" aria-label="Link to issue" />
                  <mat-autocomplete #linkAuto="matAutocomplete" (optionSelected)="onLinkSelected($event)">
                    <mat-option *ngFor="let t of linkOptions" [value]="t">{{ t.key }} · {{ t.title }}</mat-option>
                  </mat-autocomplete>
                </mat-form-field>
                <mat-form-field appearance="outline" class="link-type">
                  <mat-select [(ngModel)]="newLinkType" name="newLinkType" aria-label="Link type">
                    <mat-option *ngFor="let lt of TASK_LINK_TYPES" [value]="lt">{{ LINK_TYPE_LABELS[lt] }}</mat-option>
                  </mat-select>
                </mat-form-field>
                <button mat-raised-button color="primary" type="submit" [disabled]="!selectedLinkTarget">Link</button>
              </form>
            </section>

            <section class="panel">
              <h2 class="panel-title">Meta</h2>
              <div class="field-row"><mat-icon>schedule</mat-icon><span class="field-label">Created</span><span class="field-value">{{ task.createdAt | date: 'medium' }}</span></div>
              <div class="field-row"><mat-icon>update</mat-icon><span class="field-label">Updated</span><span class="field-value">{{ task.updatedAt | date: 'medium' }}</span></div>
              <div class="field-row"><mat-icon>tag</mat-icon><span class="field-label">Version</span><span class="field-value">{{ task.version }}</span></div>
            </section>
          </aside>
        </div>

        <div *ngIf="conflict" class="conflict-banner" role="alert">This task was modified by another user. Reloading…</div>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .detail { max-width: 1180px; }
      .back { color: var(--text-muted); }

      .task-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
      .task-head .type-icon { font-size: 22px; width: 22px; height: 22px; }
      .task-head .key { font-size: 0.8rem; color: var(--text-faint); font-weight: 600; }
      .task-head h1 { margin: 0; flex: 1; font-size: 1.5rem; min-width: 220px; }
      .priority { font-size: 0.72rem; font-weight: 700; padding: 4px 12px; border-radius: 20px; }

      .layout { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
      .main-col { display: flex; flex-direction: column; gap: 16px; }

      .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px; }
      .panel-title {
        font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em;
        color: var(--text-muted); margin: 0 0 12px; display: flex; align-items: center; gap: 8px;
      }
      .count { background: var(--surface-2); border-radius: 10px; padding: 1px 8px; font-size: 0.72rem; }
      .muted { color: var(--text-faint); font-size: 0.85rem; }

      .desc { color: var(--text); margin: 0 0 8px; line-height: 1.6; white-space: pre-wrap; }
      .edit-btn { color: var(--primary); padding-left: 0; }
      .edit-actions { display: flex; justify-content: flex-end; gap: 8px; }

      .subtask { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-top: 1px solid var(--border); }
      .subtask a { color: var(--text); font-weight: 500; }
      .subtask a:hover { color: var(--primary); }
      .sub-status { font-size: 18px; width: 18px; height: 18px; }
      .sub-meta { margin-left: auto; font-size: 0.72rem; color: var(--text-faint); }

      .inline-form { display: flex; gap: 8px; align-items: flex-start; margin-top: 10px; }
      .inline-form mat-form-field { flex: 1; }

      .activity { list-style: none; margin: 0; padding: 0; }
      .activity-item { display: flex; gap: 10px; padding: 10px 0; border-top: 1px solid var(--border); }
      .activity-body { flex: 1; }
      .activity-text { font-size: 0.9rem; line-height: 1.5; }
      .activity-time { font-size: 0.72rem; color: var(--text-faint); margin-top: 2px; }

      .comment-box { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
      .comment-box textarea {
        border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px;
        font-family: inherit; font-size: 0.9rem; resize: none; outline: none;
      }
      .comment-box textarea:focus { border-color: var(--primary); }
      .comment-actions { display: flex; justify-content: space-between; align-items: center; }
      .hint { font-size: 0.72rem; color: var(--text-faint); }

      .comment { display: flex; gap: 10px; padding: 10px 0; border-top: 1px solid var(--border); }
      .comment-body { flex: 1; }
      .comment-content { font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap; }
      .comment-time { font-size: 0.72rem; color: var(--text-faint); margin-top: 4px; }

      .avatar {
        width: 32px; height: 32px; border-radius: 50%; color: #fff; font-size: 0.72rem; font-weight: 700;
        display: inline-flex; align-items: center; justify-content: center; text-transform: uppercase; flex-shrink: 0;
      }
      .avatar.sm { width: 24px; height: 24px; font-size: 0.58rem; }

      .status-option { display: inline-flex; align-items: center; gap: 8px; }
      .type-option-icon { font-size: 16px; width: 16px; height: 16px; vertical-align: -3px; margin-right: 8px; }

      .field-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 0.86rem; }
      .field-row mat-icon { font-size: 17px; width: 17px; height: 17px; color: var(--text-faint); }
      .field-label { color: var(--text-muted); flex: 1; }
      .field-value { font-weight: 500; }
      .watchers-row .watch-btn { color: var(--primary); font-weight: 600; }
      .watcher-avatars { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }

      .minutes-input { width: 72px; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 8px; font-family: inherit; }
      .log-time { display: flex; gap: 8px; align-items: flex-start; margin-top: 8px; }
      .log-input { flex: 1; }

      .labels { display: flex; flex-wrap: wrap; gap: 6px; }
      .label {
        display: inline-flex; align-items: center; gap: 2px; background: #f0eefd; color: #5a4bd1;
        font-size: 0.75rem; font-weight: 600; padding: 3px 6px 3px 10px; border-radius: 20px;
      }
      .label-remove { width: 20px; height: 20px; line-height: 20px; }
      .label-remove mat-icon { font-size: 14px; width: 14px; height: 14px; }

      .attachment, .link { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-top: 1px solid var(--border); }
      .attachment > mat-icon, .link > mat-icon { color: var(--text-faint); }
      .att-info { flex: 1; min-width: 0; }
      .att-name { all: unset; cursor: pointer; color: var(--text); font-weight: 500; font-size: 0.85rem; }
      .att-name:hover { color: var(--primary); }
      .att-meta { font-size: 0.7rem; color: var(--text-faint); }
      .att-delete { color: var(--text-faint); }
      .upload-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
      .link-type { width: 140px; }
      .link a { color: var(--primary); font-weight: 600; }

      .conflict-banner {
        background: #fff4e5; border: 1px solid #ffd591; color: #b45309;
        padding: 12px 16px; border-radius: var(--radius); margin-top: 12px;
      }

      @media (max-width: 860px) {
        .layout { grid-template-columns: 1fr; }
      }
    `
  ]
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
