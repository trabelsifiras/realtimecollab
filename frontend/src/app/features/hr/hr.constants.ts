import { LeaveStatus, LeaveType, TimeEntryStatus } from '../../core/models/hr.model';

export const TIME_ENTRY_STATUS_LABELS: Record<TimeEntryStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

export const TIME_ENTRY_STATUS_COLORS: Record<TimeEntryStatus, string> = {
  DRAFT: '#8a9099',
  SUBMITTED: '#0052cc',
  APPROVED: '#00875a',
  REJECTED: '#e01e5a'
};

export const LEAVE_TYPES: LeaveType[] = ['VACATION', 'SICK', 'PERSONAL', 'UNPAID', 'OTHER'];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  VACATION: 'Vacation',
  SICK: 'Sick leave',
  PERSONAL: 'Personal',
  UNPAID: 'Unpaid',
  OTHER: 'Other'
};

export const LEAVE_TYPE_ICONS: Record<LeaveType, string> = {
  VACATION: 'beach_access',
  SICK: 'healing',
  PERSONAL: 'person',
  UNPAID: 'money_off',
  OTHER: 'event_note'
};

export const LEAVE_TYPE_COLORS: Record<LeaveType, string> = {
  VACATION: '#6c5ce7',
  SICK: '#e01e5a',
  PERSONAL: '#36c5f0',
  UNPAID: '#8a9099',
  OTHER: '#ecb22e'
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled'
};

export const LEAVE_STATUS_COLORS: Record<LeaveStatus, string> = {
  PENDING: '#ecb22e',
  APPROVED: '#00875a',
  REJECTED: '#e01e5a',
  CANCELLED: '#8a9099'
};

export const LEAVE_STATUSES: LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
export const TIME_ENTRY_STATUSES: TimeEntryStatus[] = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'];
