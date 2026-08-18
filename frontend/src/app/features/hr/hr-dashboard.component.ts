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
  templateUrl: './hr-dashboard.component.html',
  styleUrl: './hr-dashboard.component.css'
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
