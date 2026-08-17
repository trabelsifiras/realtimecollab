import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HrService } from '../../core/services/hr.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { WorkspacePickerComponent } from './workspace-picker.component';
import { HrEmployeeSummary, HrOverview, LeaveRequest, TimeEntry } from '../../core/models/hr.model';
import { WorkspaceMember, WorkspaceRole } from '../../core/models/workspace.model';
import { avatarColor, initials } from '../../shared/utils/avatar.util';
import { minutesToLabel, toISODate } from '../../shared/utils/date.util';
import {
  LEAVE_STATUS_COLORS,
  LEAVE_STATUS_LABELS,
  LEAVE_TYPE_COLORS,
  LEAVE_TYPE_ICONS,
  LEAVE_TYPE_LABELS,
  TIME_ENTRY_STATUS_LABELS
} from './hr.constants';

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  OWNER: '#e01e5a',
  ADMIN: '#6c5ce7',
  HR: '#ecb22e',
  MEMBER: '#36c5f0',
  GUEST: '#9b9b9b'
};

@Component({
  selector: 'app-hr-dashboard',
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
    MatTabsModule,
    MatTooltipModule,
    WorkspacePickerComponent
  ],
  template: `
    <div class="page-container hr">
      <header class="header">
        <div>
          <h1>HR Dashboard</h1>
          <p class="subtitle">Employee hours and leave overview.</p>
        </div>
        <app-workspace-picker [workspaceId]="workspaceId" (workspaceChange)="onWorkspaceChange($event)"></app-workspace-picker>
      </header>

      <div *ngIf="forbidden" class="forbidden" role="alert">
        <mat-icon>lock</mat-icon>
        <p>You need the HR, Admin or Owner role to view this page.</p>
      </div>

      <mat-tab-group *ngIf="workspaceId && !forbidden" class="tabs" animationDuration="0ms">
        <mat-tab label="Overview">
          <div class="tab-body">
            <div class="range-bar">
              <mat-form-field appearance="outline" class="range-field">
                <mat-label>From</mat-label>
                <input matInput type="date" [(ngModel)]="fromInput" name="from" (change)="loadOverview()" aria-label="Overview start date" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="range-field">
                <mat-label>To</mat-label>
                <input matInput type="date" [(ngModel)]="toInput" name="to" (change)="loadOverview()" aria-label="Overview end date" />
              </mat-form-field>
            </div>

            <div *ngIf="overview" class="emp-grid">
              <article *ngFor="let e of overview.employees" class="emp-card">
                <div class="emp-head">
                  <span class="avatar" [style.background]="avatarColor(e.username ?? e.userId)">{{ empInitials(e) }}</span>
                  <div class="emp-meta">
                    <div class="emp-name">{{ empName(e) }}</div>
                    <span class="role-pill" [style.background]="roleColor(e.role) + '22'" [style.color]="roleColor(e.role)">{{ e.role }}</span>
                  </div>
                </div>

                <div class="emp-hero">
                  <div class="hero-value">{{ minutesToLabel(e.totalMinutes) }}</div>
                  <div class="hero-label">Total hours</div>
                </div>

                <div class="stat-row">
                  <div class="stat"><span class="s-value">{{ minutesToLabel(e.submittedMinutes) }}</span><span class="s-label">Submitted</span></div>
                  <div class="stat"><span class="s-value">{{ minutesToLabel(e.approvedMinutes) }}</span><span class="s-label">Approved</span></div>
                  <div class="stat"><span class="s-value">{{ e.pendingTimeEntries }}</span><span class="s-label">Pending entries</span></div>
                </div>

                <div class="leave-chips">
                  <span *ngIf="e.vacationDays" class="leave-chip" [style.background]="LEAVE_TYPE_COLORS['VACATION'] + '22'" [style.color]="LEAVE_TYPE_COLORS['VACATION']">Vacation {{ e.vacationDays }}d</span>
                  <span *ngIf="e.sickDays" class="leave-chip" [style.background]="LEAVE_TYPE_COLORS['SICK'] + '22'" [style.color]="LEAVE_TYPE_COLORS['SICK']">Sick {{ e.sickDays }}d</span>
                  <span *ngIf="e.pendingLeaveRequests" class="leave-chip" [style.background]="LEAVE_STATUS_COLORS['PENDING'] + '22'" [style.color]="LEAVE_STATUS_COLORS['PENDING']">{{ e.pendingLeaveRequests }} pending leave</span>
                </div>
              </article>
              <div *ngIf="overview.employees.length === 0" class="empty">No employees found for this period.</div>
            </div>
          </div>
        </mat-tab>

        <mat-tab [label]="'Time approvals (' + submittedEntries.length + ')'">
          <div class="tab-body">
            <ul class="approval-list">
              <li *ngFor="let e of submittedEntries" class="approval-row">
                <span class="avatar" [style.background]="avatarColor(e.userId)">{{ memberInitials(e.userId) }}</span>
                <div class="a-main">
                  <div class="a-title"><strong>{{ memberName(e.userId) }}</strong> · {{ e.projectName ?? 'Project' }}</div>
                  <div class="a-sub">{{ e.entryDate | date: 'mediumDate' }} · {{ minutesToLabel(e.durationMinutes) }} <span *ngIf="e.description">· {{ e.description }}</span></div>
                  <div class="reject-box" *ngIf="rejectingEntryId === e.id">
                    <mat-form-field appearance="outline" class="reject-input">
                      <mat-label>Rejection reason</mat-label>
                      <input matInput [(ngModel)]="rejectReason" name="rejectReason" aria-label="Rejection reason" />
                    </mat-form-field>
                    <button mat-raised-button color="warn" (click)="confirmRejectEntry(e)">Confirm</button>
                    <button mat-button (click)="rejectingEntryId = null">Cancel</button>
                  </div>
                </div>
                <div class="a-actions">
                  <button mat-icon-button class="approve" (click)="approveEntry(e)" aria-label="Approve entry"><mat-icon>check_circle</mat-icon></button>
                  <button mat-icon-button class="reject" (click)="startRejectEntry(e)" aria-label="Reject entry"><mat-icon>cancel</mat-icon></button>
                </div>
              </li>
              <li *ngIf="submittedEntries.length === 0" class="empty">No time entries awaiting approval.</li>
            </ul>
          </div>
        </mat-tab>

        <mat-tab [label]="'Leave approvals (' + pendingLeaves.length + ')'">
          <div class="tab-body">
            <ul class="approval-list">
              <li *ngFor="let l of pendingLeaves" class="approval-row">
                <span class="avatar" [style.background]="avatarColor(l.userId)">{{ memberInitials(l.userId) }}</span>
                <div class="a-main">
                  <div class="a-title">
                    <strong>{{ memberName(l.userId) }}</strong> · {{ LEAVE_TYPE_LABELS[l.type] }}
                    <mat-icon class="inline-icon" [style.color]="LEAVE_TYPE_COLORS[l.type]">{{ LEAVE_TYPE_ICONS[l.type] }}</mat-icon>
                  </div>
                  <div class="a-sub">{{ l.startDate | date: 'mediumDate' }} – {{ l.endDate | date: 'mediumDate' }} <span *ngIf="l.reason">· {{ l.reason }}</span></div>
                  <div class="reject-box" *ngIf="rejectingLeaveId === l.id">
                    <mat-form-field appearance="outline" class="reject-input">
                      <mat-label>Review note</mat-label>
                      <input matInput [(ngModel)]="rejectReason" name="leaveNote" aria-label="Review note" />
                    </mat-form-field>
                    <button mat-raised-button color="warn" (click)="confirmRejectLeave(l)">Confirm</button>
                    <button mat-button (click)="rejectingLeaveId = null">Cancel</button>
                  </div>
                </div>
                <div class="a-actions">
                  <button mat-icon-button class="approve" (click)="approveLeave(l)" aria-label="Approve leave request"><mat-icon>check_circle</mat-icon></button>
                  <button mat-icon-button class="reject" (click)="startRejectLeave(l)" aria-label="Reject leave request"><mat-icon>cancel</mat-icon></button>
                </div>
              </li>
              <li *ngIf="pendingLeaves.length === 0" class="empty">No leave requests awaiting approval.</li>
            </ul>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .hr { max-width: 1100px; }
      .back { color: var(--text-muted); }

      .hr-nav { display: flex; gap: 4px; margin: 4px 0 8px; flex-wrap: wrap; }
      .hr-nav a { padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; color: var(--text-muted); }
      .hr-nav a:hover { background: var(--surface-2); color: var(--text); }
      .hr-nav a.active { background: var(--primary); color: #fff; }

      .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
      .header h1 { margin: 0; }
      .subtitle { margin: 4px 0 0; color: var(--text-muted); font-size: 0.9rem; }

      .forbidden {
        display: flex; align-items: center; gap: 12px;
        background: #fff4e5; border: 1px solid #ffd591; color: #b45309;
        padding: 18px 20px; border-radius: var(--radius-lg); margin-top: 16px;
      }
      .forbidden p { margin: 0; }

      .tab-body { padding: 20px 0; }

      .range-bar { display: flex; gap: 12px; margin-bottom: 16px; }
      .range-field { width: 180px; }

      .emp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
      .emp-card {
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px;
      }
      .emp-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
      .emp-meta { min-width: 0; }
      .emp-name { font-weight: 700; }
      .role-pill { font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 20px; }

      .emp-hero { text-align: center; padding: 14px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); margin-bottom: 12px; }
      .hero-value { font-size: 1.5rem; font-weight: 800; }
      .hero-label { font-size: 0.72rem; color: var(--text-faint); text-transform: uppercase; letter-spacing: 0.04em; }

      .stat-row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
      .stat { display: flex; flex-direction: column; align-items: center; flex: 1; }
      .s-value { font-weight: 700; font-size: 0.95rem; }
      .s-label { font-size: 0.68rem; color: var(--text-faint); }

      .leave-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .leave-chip { font-size: 0.7rem; font-weight: 600; padding: 3px 8px; border-radius: 20px; }

      .approval-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .approval-row {
        display: flex; gap: 14px; align-items: flex-start;
        background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 16px;
      }
      .a-main { flex: 1; min-width: 0; }
      .a-title { display: flex; align-items: center; gap: 6px; }
      .inline-icon { font-size: 16px; width: 16px; height: 16px; }
      .a-sub { font-size: 0.82rem; color: var(--text-muted); margin-top: 2px; }
      .a-actions { display: flex; gap: 4px; }
      .a-actions .approve { color: var(--accent-dark); }
      .a-actions .reject { color: var(--text-faint); }
      .a-actions .reject:hover { color: var(--danger); }

      .reject-box { display: flex; gap: 8px; align-items: center; margin-top: 8px; flex-wrap: wrap; }
      .reject-input { width: 260px; }

      .empty { color: var(--text-faint); text-align: center; padding: 32px; }

      @media (max-width: 640px) {
        .range-field { width: 100%; }
        .range-bar { flex-direction: column; }
        .approval-row { flex-wrap: wrap; }
        .reject-input { width: 100%; }
      }
    `
  ]
})
export class HrDashboardComponent {
  private readonly hrService = inject(HrService);
  private readonly workspaceService = inject(WorkspaceService);

  readonly ROLE_COLORS = ROLE_COLORS;
  readonly LEAVE_TYPE_LABELS = LEAVE_TYPE_LABELS;
  readonly LEAVE_TYPE_COLORS = LEAVE_TYPE_COLORS;
  readonly LEAVE_TYPE_ICONS = LEAVE_TYPE_ICONS;
  readonly LEAVE_STATUS_COLORS = LEAVE_STATUS_COLORS;
  readonly TIME_ENTRY_STATUS_LABELS = TIME_ENTRY_STATUS_LABELS;
  readonly avatarColor = avatarColor;
  readonly minutesToLabel = minutesToLabel;

  overview: HrOverview | null = null;
  submittedEntries: TimeEntry[] = [];
  pendingLeaves: LeaveRequest[] = [];
  members: WorkspaceMember[] = [];
  workspaceId: string | null = null;

  fromInput = '';
  toInput = '';
  forbidden = false;
  rejectingEntryId: string | null = null;
  rejectingLeaveId: string | null = null;
  rejectReason = '';

  onWorkspaceChange(id: string): void {
    this.workspaceId = id;
    this.forbidden = false;
    const now = new Date();
    this.fromInput = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
    this.toInput = toISODate(now);

    this.workspaceService.listMembers(id).subscribe((members) => (this.members = members));
    this.loadOverview();
    this.loadApprovals();
  }

  loadOverview(): void {
    const wsId = this.workspaceId;
    if (!wsId) return;
    this.hrService.overview(wsId, this.fromInput, this.toInput).subscribe({
      next: (overview) => {
        this.overview = overview;
        this.forbidden = false;
      },
      error: () => (this.forbidden = true)
    });
  }

  loadApprovals(): void {
    const wsId = this.workspaceId;
    if (!wsId) return;
    this.hrService.listTeamTimeEntries(wsId, { status: 'SUBMITTED' }).subscribe({
      next: (entries) => (this.submittedEntries = entries),
      error: () => (this.forbidden = true)
    });
    this.hrService.listTeamLeaveRequests(wsId, 'PENDING').subscribe({
      next: (leaves) => (this.pendingLeaves = leaves),
      error: () => (this.forbidden = true)
    });
  }

  approveEntry(entry: TimeEntry): void {
    this.hrService.reviewTimeEntry(entry.id, 'APPROVED').subscribe(() => this.loadApprovals());
  }

  startRejectEntry(entry: TimeEntry): void {
    this.rejectingEntryId = entry.id;
    this.rejectingLeaveId = null;
    this.rejectReason = '';
  }

  confirmRejectEntry(entry: TimeEntry): void {
    this.hrService.reviewTimeEntry(entry.id, 'REJECTED', this.rejectReason.trim() || undefined).subscribe(() => {
      this.rejectingEntryId = null;
      this.loadApprovals();
    });
  }

  approveLeave(leave: LeaveRequest): void {
    this.hrService.reviewLeaveRequest(leave.id, 'APPROVED').subscribe(() => this.loadApprovals());
  }

  startRejectLeave(leave: LeaveRequest): void {
    this.rejectingLeaveId = leave.id;
    this.rejectingEntryId = null;
    this.rejectReason = '';
  }

  confirmRejectLeave(leave: LeaveRequest): void {
    this.hrService.reviewLeaveRequest(leave.id, 'REJECTED', this.rejectReason.trim() || undefined).subscribe(() => {
      this.rejectingLeaveId = null;
      this.loadApprovals();
    });
  }

  memberName(userId: string): string {
    const member = this.members.find((m) => m.userId === userId);
    const user = member?.user;
    if (!user) return 'Employee';
    return user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username;
  }

  memberInitials(userId: string): string {
    const member = this.members.find((m) => m.userId === userId);
    const user = member?.user;
    const name = user ? `${user.firstName ?? ''} ${user.lastName ?? user.username}`.trim() : userId;
    return initials(name);
  }

  roleColor(role: string): string {
    return ROLE_COLORS[role as WorkspaceRole] ?? '#9b9b9b';
  }

  empName(e: HrEmployeeSummary): string {
    if (e.firstName && e.lastName) return `${e.firstName} ${e.lastName}`;
    return e.username ?? 'Employee';
  }

  empInitials(e: HrEmployeeSummary): string {
    return initials(`${e.firstName ?? ''} ${e.lastName ?? e.username ?? ''}`.trim());
  }
}
