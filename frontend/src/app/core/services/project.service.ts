import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Project, ProjectStatus } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly baseUrl = `${environment.apiUrl}`;

  constructor(private readonly http: HttpClient) {}

  list(workspaceId: string): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.baseUrl}/workspaces/${workspaceId}/projects`);
  }

  get(id: string): Observable<Project> {
    return this.http.get<Project>(`${this.baseUrl}/projects/${id}`);
  }

  create(workspaceId: string, request: { name: string; description?: string; key?: string; status?: ProjectStatus }): Observable<Project> {
    return this.http.post<Project>(`${this.baseUrl}/workspaces/${workspaceId}/projects`, request);
  }

  update(id: string, request: { name: string; description?: string; key?: string; status?: ProjectStatus }): Observable<Project> {
    return this.http.patch<Project>(`${this.baseUrl}/projects/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/projects/${id}`);
  }
}
