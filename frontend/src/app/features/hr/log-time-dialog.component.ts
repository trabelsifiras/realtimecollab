import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HrService } from '../../core/services/hr.service';
import { TaskService } from '../../core/services/task.service';
import { Project } from '../../core/models/project.model';
import { Task } from '../../core/models/task.model';
import { TimeEntry } from '../../core/models/hr.model';
import { toISODate } from '../../shared/utils/date.util';
import { TIME_ENTRY_STATUS_COLORS, TIME_ENTRY_STATUS_LABELS } from './hr.constants';

export interface LogTimeDialogData {
  workspaceId: string;
  projects: Project[];
  date?: string;
  entry?: TimeEntry;
}

export interface LogTimeDialogResult {
  entry?: TimeEntry;
  deleted?: boolean;
}

@Component({
  selector: 'app-log-time-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    NgFor,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>{{ title() }}</h2>

    <mat-dialog-content>
      <div *ngIf="readonly" class="status-banner">
        <span class="status-pill" [style.background]="statusColor() + '22'" [style.color]="statusColor()">{{ statusLabel() }}</span>
        <span *ngIf="data.entry?.rejectionReason" class="reject-reason">{{ data.entry?.rejectionReason }}</span>
      </div>

      <div class="form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Date</mat-label>
          <input matInput type="date" [(ngModel)]="form.date" name="date" [readonly]="readonly" aria-label="Date" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Project</mat-label>
          <mat-select [(ngModel)]="form.projectId" name="projectId" (ngModelChange)="onProjectChange()" [disabled]="readonly" aria-label="Project">
            <mat-option *ngFor="let p of data.projects" [value]="p.id">{{ p.name }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full" *ngIf="form.projectId">
          <mat-label>Task (optional)</mat-label>
          <mat-select [(ngModel)]="form.taskId" name="taskId" [disabled]="readonly" aria-label="Task">
            <mat-option [value]="">None</mat-option>
            <mat-option *ngFor="let t of tasks" [value]="t.id">{{ t.key }} · {{ t.title }}</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="duration" role="group" aria-label="Duration">
          <mat-form-field appearance="outline">
            <mat-label>Hours</mat-label>
            <input matInput type="number" min="0" max="24" [(ngModel)]="form.hours" name="hours" [readonly]="readonly" aria-label="Hours" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Minutes</mat-label>
            <input matInput type="number" min="0" max="59" [(ngModel)]="form.minutes" name="minutes" [readonly]="readonly" aria-label="Minutes" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput [(ngModel)]="form.description" name="description" rows="2" [readonly]="readonly" aria-label="Description"></textarea>
        </mat-form-field>
      </div>

      <div *ngIf="error" class="error-text" role="alert">{{ error }}</div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button *ngIf="canDelete" mat-button color="warn" (click)="remove()" [disabled]="saving">Delete</button>
      <span class="spacer"></span>
      <button mat-button mat-dialog-close>Close</button>
      <button *ngIf="!readonly" mat-raised-button color="primary" (click)="save()" [disabled]="saving">
        <mat-spinner *ngIf="saving" diameter="18"></mat-spinner>
        <span>{{ saving ? 'Saving…' : (isEdit ? 'Save' : 'Add') }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .form { display: flex; flex-direction: column; gap: 2px; margin-top: 8px; }
      .duration { display: flex; gap: 12px; }
      .duration mat-form-field { flex: 1; }
      .spacer { flex: 1 1 auto; }
      .status-banner { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
      .status-pill { font-size: 0.72rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
      .reject-reason { font-size: 0.82rem; color: var(--danger); }
      .error-text { color: var(--danger); font-size: 0.85rem; margin: 8px 0; }
    `
  ]
})
export class LogTimeDialogComponent {
  readonly data = inject<LogTimeDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<LogTimeDialogComponent>);
  private readonly hrService = inject(HrService);
  private readonly taskService = inject(TaskService);

  tasks: Task[] = [];
  saving = false;
  error = '';
  form = { date: '', projectId: '', taskId: '', hours: null as number | null, minutes: null as number | null, description: '' };

  readonly TIME_ENTRY_STATUS_LABELS = TIME_ENTRY_STATUS_LABELS;
  readonly TIME_ENTRY_STATUS_COLORS = TIME_ENTRY_STATUS_COLORS;

  get isEdit(): boolean {
    return !!this.data.entry;
  }

  get readonly(): boolean {
    return !!this.data.entry && this.data.entry.status !== 'DRAFT';
  }

  get canDelete(): boolean {
    return this.isEdit && !this.readonly;
  }

  constructor() {
    const e = this.data.entry;
    if (e) {
      this.form = {
        date: e.entryDate,
        projectId: e.projectId,
        taskId: e.taskId ?? '',
        hours: Math.floor(e.durationMinutes / 60),
        minutes: e.durationMinutes % 60,
        description: e.description ?? ''
      };
      if (e.projectId) this.onProjectChange();
    } else {
      this.form.date = this.data.date ?? toISODate(new Date());
    }
  }

  title(): string {
    if (this.readonly) return 'Time entry';
    return this.isEdit ? 'Edit time' : 'Log time';
  }

  statusLabel(): string {
    return this.data.entry ? TIME_ENTRY_STATUS_LABELS[this.data.entry.status] : '';
  }

  statusColor(): string {
    return this.data.entry ? TIME_ENTRY_STATUS_COLORS[this.data.entry.status] : '#8a9099';
  }

  onProjectChange(): void {
    this.tasks = [];
    if (!this.form.projectId) return;
    this.taskService.list(this.form.projectId, { size: 200 }).subscribe((page) => (this.tasks = page.content));
  }

  save(): void {
    const totalMinutes = (this.form.hours ?? 0) * 60 + (this.form.minutes ?? 0);
    if (!this.form.date) return this.fail('Please choose a date.');
    if (!this.form.projectId) return this.fail('Please choose a project.');
    if (totalMinutes <= 0) return this.fail('Duration must be greater than zero.');
    if (totalMinutes > 1440) return this.fail('Duration cannot exceed 24 hours.');

    const body = {
      projectId: this.form.projectId,
      taskId: this.form.taskId || undefined,
      entryDate: this.form.date,
      durationMinutes: totalMinutes,
      description: this.form.description.trim() || undefined
    };

    this.saving = true;
    const action = this.isEdit
      ? this.hrService.updateTimeEntry(this.data.entry!.id, body)
      : this.hrService.createTimeEntry(this.data.workspaceId, body);

    action.subscribe({
      next: (entry) => this.dialogRef.close({ entry }),
      error: () => {
        this.saving = false;
        this.fail('Could not save the entry. Please try again.');
      }
    });
  }

  remove(): void {
    if (!this.data.entry) return;
    this.saving = true;
    this.hrService.deleteTimeEntry(this.data.entry.id).subscribe({
      next: () => this.dialogRef.close({ deleted: true }),
      error: () => {
        this.saving = false;
        this.fail('Could not delete the entry.');
      }
    });
  }

  private fail(message: string): void {
    this.error = message;
  }
}
