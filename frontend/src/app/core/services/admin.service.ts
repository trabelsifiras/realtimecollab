import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserRole } from '../models/user.model';
import { Workspace, WorkspaceMember, WorkspaceRole } from '../models/workspace.model';
import { PageResponse } from '../models/api.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  constructor(private readonly http: HttpClient) {}

  listUsers(query?: string, page = 0, size = 200): Observable<PageResponse<User>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (query) params = params.set('query', query);
    return this.http.get<PageResponse<User>>(`${this.baseUrl}/users`, { params });
  }

  updateUser(id: string, request: { role?: UserRole; active?: boolean }): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/users/${id}`, request);
  }

  listWorkspaces(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(`${this.baseUrl}/workspaces`);
  }

  listMembers(workspaceId: string): Observable<WorkspaceMember[]> {
    return this.http.get<WorkspaceMember[]>(`${this.baseUrl}/workspaces/${workspaceId}/members`);
  }

  assignRole(workspaceId: string, userId: string, role: WorkspaceRole): Observable<WorkspaceMember> {
    return this.http.patch<WorkspaceMember>(`${this.baseUrl}/workspaces/${workspaceId}/members/${userId}`, { role });
  }

  removeMember(workspaceId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/workspaces/${workspaceId}/members/${userId}`);
  }
}
