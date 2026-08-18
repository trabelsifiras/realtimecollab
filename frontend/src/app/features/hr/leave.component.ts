import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { HrService } from '../../core/services/hr.service';
import { LeaveRequest, LeaveType } from '../../core/models/hr.model';
import { WorkspacePickerComponent } from './workspace-picker.component';
import { inclusiveDays, toISODate } from '../../shared/utils/date.util';
import {
  LEAVE_STATUS_COLORS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_COLORS,
  LEAVE_TYPE_ICONS,
  LEAVE_TYPE_LABELS,
  LEAVE_TYPES
} from './hr.constants';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    NgFor,
    NgIf,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    WorkspacePickerComponent
  ],
  templateUrl: './leave.component.html',
  styleUrl: './leave.component.css'
})
export class LeaveComponent {
  private readonly hrService = inject(HrService);

  readonly LEAVE_TYPES = LEAVE_TYPES;
  readonly LEAVE_TYPE_LABELS = LEAVE_TYPE_LABELS;
  readonly LEAVE_TYPE_ICONS = LEAVE_TYPE_ICONS;
  readonly LEAVE_TYPE_COLORS = LEAVE_TYPE_COLORS;
  readonly LEAVE_STATUS_LABELS = LEAVE_STATUS_LABELS;
  readonly LEAVE_STATUS_COLORS = LEAVE_STATUS_COLORS;
  readonly inclusiveDays = inclusiveDays;

  workspaceId: string | null = null;
  requests: LeaveRequest[] = [];
  showForm = false;
  saving = false;
  formError = '';
  form = { type: 'VACATION' as LeaveType, startDate: '', endDate: '', reason: '' };

  onWorkspaceChange(id: string): void {
    this.workspaceId = id;
    this.load();
  }

  load(): void {
    if (!this.workspaceId) return;
    this.hrService.listMyLeaveRequests(this.workspaceId).subscribe((requests) => (this.requests = requests));
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.formError = '';
    if (this.showForm && !this.form.startDate) {
      this.form.startDate = toISODate(new Date());
      this.form.endDate = this.form.startDate;
    }
  }

  create(): void {
    if (!this.workspaceId) return;
    if (!this.form.startDate || !this.form.endDate) {
      this.formError = 'Please choose both start and end dates.';
      return;
    }
    if (this.form.endDate < this.form.startDate) {
      this.formError = 'End date must be on or after the start date.';
      return;
    }

    this.saving = true;
    this.hrService.createLeaveRequest(this.workspaceId, {
      type: this.form.type,
      startDate: this.form.startDate,
      endDate: this.form.endDate,
      reason: this.form.reason.trim() || undefined
    }).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.formError = '';
        this.form.reason = '';
        this.load();
      },
      error: () => {
        this.saving = false;
        this.formError = 'Could not submit the request. Please try again.';
      }
    });
  }

  cancel(request: LeaveRequest): void {
    this.hrService.cancelLeaveRequest(request.id).subscribe(() => this.load());
  }
}
