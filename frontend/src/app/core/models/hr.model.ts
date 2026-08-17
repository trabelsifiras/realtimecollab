export type TimeEntryStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type LeaveType = 'VACATION' | 'SICK' | 'PERSONAL' | 'UNPAID' | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface TimeEntry {
  id: string;
  workspaceId: string;
  userId: string;
  projectId: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  entryDate: string;
  durationMinutes: number;
  description?: string;
  status: TimeEntryStatus;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id: string;
  workspaceId: string;
  userId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HrEmployeeSummary {
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  avatarUrl?: string;
  role: string;
  totalMinutes: number;
  submittedMinutes: number;
  approvedMinutes: number;
  pendingTimeEntries: number;
  vacationDays: number;
  sickDays: number;
  personalDays: number;
  unpaidDays: number;
  otherDays: number;
  pendingLeaveRequests: number;
}

export interface HrOverview {
  from: string;
  to: string;
  employees: HrEmployeeSummary[];
}
