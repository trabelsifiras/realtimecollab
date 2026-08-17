import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/api.model';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  private readonly unreadSignal = signal(0);
  readonly unreadCount = this.unreadSignal.asReadonly();

  constructor(private readonly http: HttpClient) {}

  list(page = 0, size = 20): Observable<PageResponse<Notification>> {
    const params = new HttpParams().set('page', String(page)).set('size', String(size));
    return this.http.get<PageResponse<Notification>>(this.baseUrl, { params });
  }

  refreshUnreadCount(): Observable<number> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`).pipe(
      tap((response) => this.unreadSignal.set(response.count)),
      map((response) => response.count)
    );
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`);
  }

  markRead(id: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/read-all`, {});
  }

  setUnreadCount(count: number): void {
    this.unreadSignal.set(count);
  }

  incrementUnread(): void {
    this.unreadSignal.update((value) => value + 1);
  }
}
