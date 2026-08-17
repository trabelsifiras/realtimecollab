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
  template: `
    <div class="page-container leave">
      <header class="header">
        <div>
          <h1>My Leave</h1>
          <p class="subtitle">Request time off and track the status of your requests.</p>
        </div>
        <div class="header-actions">
          <app-workspace-picker [workspaceId]="workspaceId" (workspaceChange)="onWorkspaceChange($event)"></app-workspace-picker>
          <button mat-raised-button color="primary" (click)="toggleForm()" [disabled]="!workspaceId">
            <mat-icon>{{ showForm ? 'close' : 'add' }}</mat-icon> Request time off
          </button>
        </div>
      </header>

      <ng-container *ngIf="workspaceId">
        <form *ngIf="showForm" class="form-card" (ngSubmit)="create()" aria-labelledby="leave-form-title">
          <h2 id="leave-form-title">New leave request</h2>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Type</mat-label>
              <mat-select [(ngModel)]="form.type" name="type" aria-label="Leave type">
                <mat-option *ngFor="let t of LEAVE_TYPES" [value]="t">
                  <mat-icon class="type-option-icon" [style.color]="LEAVE_TYPE_COLORS[t]">{{ LEAVE_TYPE_ICONS[t] }}</mat-icon>{{ LEAVE_TYPE_LABELS[t] }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Start date</mat-label>
              <input matInput type="date" [(ngModel)]="form.startDate" name="startDate" aria-label="Start date" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>End date</mat-label>
              <input matInput type="date" [(ngModel)]="form.endDate" name="endDate" aria-label="End date" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Reason (optional)</mat-label>
              <textarea matInput [(ngModel)]="form.reason" name="reason" rows="2" aria-label="Reason"></textarea>
            </mat-form-field>
          </div>
          <div *ngIf="formError" class="error-text" role="alert">{{ formError }}</div>
          <div class="form-actions">
            <button mat-button type="button" (click)="toggleForm()">Cancel</button>
            <button mat-raised-button color="primary" type="submit" [disabled]="saving">Submit request</button>
          </div>
        </form>

        <section aria-labelledby="requests-title">
          <h2 id="requests-title" class="section-title">Requests <span class="count">{{ requests.length }}</span></h2>
          <ul class="request-list">
            <li *ngFor="let r of requests" class="request-card">
              <span class="type-icon" [style.background]="LEAVE_TYPE_COLORS[r.type] + '22'" [style.color]="LEAVE_TYPE_COLORS[r.type]">
                <mat-icon>{{ LEAVE_TYPE_ICONS[r.type] }}</mat-icon>
              </span>
              <div class="request-main">
                <div class="request-title">
                  <strong>{{ LEAVE_TYPE_LABELS[r.type] }}</strong>
                  <span class="status-pill" [style.background]="LEAVE_STATUS_COLORS[r.status] + '22'" [style.color]="LEAVE_STATUS_COLORS[r.status]">
                    {{ LEAVE_STATUS_LABELS[r.status] }}
                  </span>
                </div>
                <div class="request-dates">
                  <mat-icon>event</mat-icon>
                  {{ r.startDate | date: 'mediumDate' }} – {{ r.endDate | date: 'mediumDate' }}
                  <span class="days">({{ inclusiveDays(r.startDate, r.endDate) }} days)</span>
                </div>
                <div class="request-reason" *ngIf="r.reason">{{ r.reason }}</div>
                <div class="request-note" *ngIf="r.reviewNote"><mat-icon>rate_review</mat-icon> {{ r.reviewNote }}</div>
              </div>
              <button mat-button class="cancel-btn" *ngIf="r.status === 'PENDING' || r.status === 'APPROVED'" (click)="cancel(r)">
                Cancel request
              </button>
            </li>
            <li *ngIf="requests.length === 0" class="no-requests">No leave requests yet. Request your first time off above.</li>
          </ul>
        </section>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .leave { max-width: 900px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
      .header h1 { margin: 0; }
      .subtitle { margin: 4px 0 0; color: var(--text-muted); font-size: 0.9rem; }
      .header-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

      .form-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        padding: 18px;
        margin: 16px 0 24px;
        box-shadow: var(--shadow-sm);
      }
      .form-card h2 { margin: 0 0 12px; font-size: 1rem; }
      .form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .full { grid-column: 1 / -1; }
      .type-option-icon { font-size: 16px; width: 16px; height: 16px; vertical-align: -3px; margin-right: 8px; }
      .form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

      .section-title { display: flex; align-items: center; gap: 8px; font-size: 1rem; margin: 8px 0 12px; }
      .count { background: var(--surface-2); border-radius: 10px; padding: 1px 8px; font-size: 0.72rem; font-weight: 600; color: var(--text-muted); }

      .request-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
      .request-card {
        display: flex; gap: 14px; align-items: flex-start;
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px 16px;
      }
      .type-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .request-main { flex: 1; min-width: 0; }
      .request-title { display: flex; align-items: center; gap: 10px; }
      .status-pill { font-size: 0.7rem; font-weight: 700; padding: 4px 10px; border-radius: 20px; white-space: nowrap; }
      .request-dates { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--text-muted); margin-top: 4px; }
      .request-dates mat-icon { font-size: 16px; width: 16px; height: 16px; }
      .days { color: var(--text-faint); font-size: 0.78rem; }
      .request-reason { font-size: 0.85rem; margin-top: 6px; }
      .request-note { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; }
      .request-note mat-icon { font-size: 15px; width: 15px; height: 15px; }
      .cancel-btn { color: var(--danger); white-space: nowrap; }
      .no-requests { color: var(--text-faint); padding: 24px; text-align: center; }

      @media (max-width: 700px) {
        .form-grid { grid-template-columns: 1fr; }
        .request-card { flex-wrap: wrap; }
      }
    `
  ]
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
