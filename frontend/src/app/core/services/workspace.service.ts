import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Workspace, WorkspaceMember, WorkspaceRole } from '../models/workspace.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly baseUrl = `${environment.apiUrl}/workspaces`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(this.baseUrl);
  }

  get(id: string): Observable<Workspace> {
    return this.http.get<Workspace>(`${this.baseUrl}/${id}`);
  }

  create(request: { name: string; description?: string }): Observable<Workspace> {
    return this.http.post<Workspace>(this.baseUrl, request);
  }

  update(id: string, request: { name: string; description?: string }): Observable<Workspace> {
    return this.http.patch<Workspace>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listMembers(id: string): Observable<WorkspaceMember[]> {
    return this.http.get<WorkspaceMember[]>(`${this.baseUrl}/${id}/members`);
  }

  addMember(id: string, userId: string): Observable<WorkspaceMember> {
    return this.http.post<WorkspaceMember>(`${this.baseUrl}/${id}/members`, { userId });
  }

  updateMemberRole(id: string, userId: string, role: WorkspaceRole): Observable<WorkspaceMember> {
    return this.http.patch<WorkspaceMember>(`${this.baseUrl}/${id}/members/${userId}`, { role });
  }

  removeMember(id: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/members/${userId}`);
  }
}
