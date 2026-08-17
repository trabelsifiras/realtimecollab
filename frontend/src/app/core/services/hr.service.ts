import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  HrOverview,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  TimeEntry,
  TimeEntryStatus
} from '../models/hr.model';

export interface TimeEntryFilter {
  from?: string;
  to?: string;
  projectId?: string;
  taskId?: string;
  userId?: string;
  status?: TimeEntryStatus;
}

@Injectable({ providedIn: 'root' })
export class HrService {
  private readonly baseUrl = `${environment.apiUrl}`;

  constructor(private readonly http: HttpClient) {}

  // ---- Time entries ----

  listMyTimeEntries(workspaceId: string, filter: TimeEntryFilter = {}): Observable<TimeEntry[]> {
    let params = new HttpParams();
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    if (filter.projectId) params = params.set('projectId', filter.projectId);
    if (filter.taskId) params = params.set('taskId', filter.taskId);
    if (filter.status) params = params.set('status', filter.status);
    return this.http.get<TimeEntry[]>(`${this.baseUrl}/workspaces/${workspaceId}/time-entries`, { params });
  }

  listTeamTimeEntries(workspaceId: string, filter: TimeEntryFilter = {}): Observable<TimeEntry[]> {
    let params = new HttpParams();
    if (filter.from) params = params.set('from', filter.from);
    if (filter.to) params = params.set('to', filter.to);
    if (filter.projectId) params = params.set('projectId', filter.projectId);
    if (filter.userId) params = params.set('userId', filter.userId);
    if (filter.status) params = params.set('status', filter.status);
    return this.http.get<TimeEntry[]>(`${this.baseUrl}/workspaces/${workspaceId}/time-entries/team`, { params });
  }

  createTimeEntry(
    workspaceId: string,
    request: { projectId: string; taskId?: string; entryDate: string; durationMinutes: number; description?: string }
  ): Observable<TimeEntry> {
    return this.http.post<TimeEntry>(`${this.baseUrl}/workspaces/${workspaceId}/time-entries`, request);
  }

  updateTimeEntry(id: string, request: Partial<TimeEntry>): Observable<TimeEntry> {
    return this.http.patch<TimeEntry>(`${this.baseUrl}/time-entries/${id}`, request);
  }

  deleteTimeEntry(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/time-entries/${id}`);
  }

  submitTimeEntry(id: string): Observable<TimeEntry> {
    return this.http.patch<TimeEntry>(`${this.baseUrl}/time-entries/${id}/submit`, {});
  }

  reviewTimeEntry(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string): Observable<TimeEntry> {
    return this.http.patch<TimeEntry>(`${this.baseUrl}/time-entries/${id}/review`, { status, rejectionReason });
  }

  // ---- Leave requests ----

  listMyLeaveRequests(workspaceId: string, status?: LeaveStatus): Observable<LeaveRequest[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<LeaveRequest[]>(`${this.baseUrl}/workspaces/${workspaceId}/leave-requests`, { params });
  }

  listTeamLeaveRequests(workspaceId: string, status?: LeaveStatus, userId?: string): Observable<LeaveRequest[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    if (userId) params = params.set('userId', userId);
    return this.http.get<LeaveRequest[]>(`${this.baseUrl}/workspaces/${workspaceId}/leave-requests/team`, { params });
  }

  createLeaveRequest(
    workspaceId: string,
    request: { type: LeaveType; startDate: string; endDate: string; reason?: string }
  ): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(`${this.baseUrl}/workspaces/${workspaceId}/leave-requests`, request);
  }

  cancelLeaveRequest(id: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.baseUrl}/leave-requests/${id}/cancel`, {});
  }

  reviewLeaveRequest(id: string, status: 'APPROVED' | 'REJECTED', reviewNote?: string): Observable<LeaveRequest> {
    return this.http.patch<LeaveRequest>(`${this.baseUrl}/leave-requests/${id}/review`, { status, reviewNote });
  }

  // ---- HR overview ----

  overview(workspaceId: string, from: string, to: string): Observable<HrOverview> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<HrOverview>(`${this.baseUrl}/workspaces/${workspaceId}/hr/overview`, { params });
  }
}
