import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Channel, ChannelType } from '../models/channel.model';
import { Message } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private readonly baseUrl = `${environment.apiUrl}`;

  constructor(private readonly http: HttpClient) {}

  list(workspaceId: string): Observable<Channel[]> {
    return this.http.get<Channel[]>(`${this.baseUrl}/workspaces/${workspaceId}/channels`);
  }

  get(id: string): Observable<Channel> {
    return this.http.get<Channel>(`${this.baseUrl}/channels/${id}`);
  }

  create(workspaceId: string, request: { type: ChannelType; name?: string; description?: string; memberIds?: string[] }): Observable<Channel> {
    return this.http.post<Channel>(`${this.baseUrl}/workspaces/${workspaceId}/channels`, request);
  }

  update(id: string, request: { name?: string; description?: string; type?: ChannelType }): Observable<Channel> {
    return this.http.patch<Channel>(`${this.baseUrl}/channels/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/channels/${id}`);
  }

  listMessages(channelId: string, before?: string, limit = 50): Observable<Message[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (before) params = params.set('before', before);
    return this.http.get<Message[]>(`${this.baseUrl}/channels/${channelId}/messages`, { params });
  }

  sendMessage(channelId: string, content: string): Observable<Message> {
    return this.http.post<Message>(`${this.baseUrl}/channels/${channelId}/messages`, { content });
  }
}
