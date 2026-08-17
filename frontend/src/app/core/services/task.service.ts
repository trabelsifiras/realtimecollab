import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/api.model';
import {
  Task,
  TaskActivity,
  TaskAttachment,
  TaskFilter,
  TaskLink,
  TaskLinkType,
  TaskPriority,
  TaskStatus,
  TaskType
} from '../models/task.model';
import { Comment } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly baseUrl = `${environment.apiUrl}`;

  constructor(private readonly http: HttpClient) {}

  list(projectId: string, filter: TaskFilter = {}): Observable<PageResponse<Task>> {
    let params = new HttpParams()
      .set('page', String(filter.page ?? 0))
      .set('size', String(filter.size ?? 100))
      .set('sort', filter.sort ?? 'createdAt,desc');

    if (filter.status) params = params.set('status', filter.status);
    if (filter.priority) params = params.set('priority', filter.priority);
    if (filter.type) params = params.set('type', filter.type);
    if (filter.assigneeId) params = params.set('assigneeId', filter.assigneeId);
    if (filter.creatorId) params = params.set('creatorId', filter.creatorId);
    if (filter.query) params = params.set('query', filter.query);
    if (filter.labels?.length) params = params.set('labels', filter.labels.join(','));

    return this.http.get<PageResponse<Task>>(`${this.baseUrl}/projects/${projectId}/tasks`, { params });
  }

  get(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.baseUrl}/tasks/${id}`);
  }

  create(
    projectId: string,
    request: {
      title: string;
      description?: string;
      type?: TaskType;
      status?: TaskStatus;
      priority?: TaskPriority;
      assigneeId?: string;
      parentId?: string;
      epicId?: string;
      storyPoints?: number;
      labels?: string[];
      dueDate?: string;
    }
  ): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/projects/${projectId}/tasks`, request);
  }

  update(id: string, request: Partial<Task> & { version: number }): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/tasks/${id}`, request);
  }

  updateStatus(id: string, status: TaskStatus, version: number): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/tasks/${id}/status`, { status, version });
  }

  updateAssignee(id: string, assigneeId: string | null, version: number): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/tasks/${id}/assignee`, { assigneeId, version });
  }

  updatePosition(id: string, position: number, version: number): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/tasks/${id}/position`, { position, version });
  }

  updateDates(id: string, startDate: string | null, dueDate: string | null, version: number): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/tasks/${id}/dates`, { startDate, dueDate, version });
  }

  setParent(id: string, parentId: string | null, version: number): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/tasks/${id}/parent`, { parentId, version });
  }

  setEpic(id: string, epicId: string | null, version: number): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/tasks/${id}/epic`, { epicId, version });
  }

  logTime(id: string, minutes: number, version: number): Observable<Task> {
    return this.http.patch<Task>(`${this.baseUrl}/tasks/${id}/log-time`, { minutes, version });
  }

  addLabel(id: string, label: string): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/tasks/${id}/labels`, { label });
  }

  removeLabel(id: string, label: string): Observable<Task> {
    return this.http.delete<Task>(`${this.baseUrl}/tasks/${id}/labels/${encodeURIComponent(label)}`);
  }

  addWatcher(id: string, userId: string): Observable<Task> {
    return this.http.post<Task>(`${this.baseUrl}/tasks/${id}/watchers`, { userId });
  }

  removeWatcher(id: string, userId: string): Observable<Task> {
    return this.http.delete<Task>(`${this.baseUrl}/tasks/${id}/watchers/${userId}`);
  }

  listSubtasks(id: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/tasks/${id}/subtasks`);
  }

  listActivities(id: string): Observable<TaskActivity[]> {
    return this.http.get<TaskActivity[]>(`${this.baseUrl}/tasks/${id}/activities`);
  }

  listLinks(id: string): Observable<TaskLink[]> {
    return this.http.get<TaskLink[]>(`${this.baseUrl}/tasks/${id}/links`);
  }

  addLink(id: string, linkType: TaskLinkType, targetTaskId: string): Observable<TaskLink> {
    return this.http.post<TaskLink>(`${this.baseUrl}/tasks/${id}/links`, { linkType, targetTaskId });
  }

  removeLink(id: string, linkId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tasks/${id}/links/${linkId}`);
  }

  listAttachments(id: string): Observable<TaskAttachment[]> {
    return this.http.get<TaskAttachment[]>(`${this.baseUrl}/tasks/${id}/attachments`);
  }

  uploadAttachment(id: string, file: File): Observable<TaskAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<TaskAttachment>(`${this.baseUrl}/tasks/${id}/attachments`, formData);
  }

  deleteAttachment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/attachments/${id}`);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tasks/${id}`);
  }

  downloadAttachment(id: string, fileName: string): void {
    this.http
      .get(`${this.baseUrl}/attachments/${id}/download`, { responseType: 'blob' })
      .subscribe((blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        URL.revokeObjectURL(url);
      });
  }

  listComments(taskId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.baseUrl}/tasks/${taskId}/comments`);
  }

  addComment(taskId: string, content: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.baseUrl}/tasks/${taskId}/comments`, { content });
  }
}
