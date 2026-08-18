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
  templateUrl: './log-time-dialog.component.html',
  styleUrl: './log-time-dialog.component.css'
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
