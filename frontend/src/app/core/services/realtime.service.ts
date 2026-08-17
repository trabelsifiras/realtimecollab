import { Injectable, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { Observable, Subject, filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RealtimeEvent } from '../models/realtime.model';
import { TokenService } from './token.service';

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private client: Client | null = null;
  private readonly eventsSubject = new Subject<RealtimeEvent>();
  private readonly subscriptions = new Map<string, StompSubscription>();
  private readonly desiredTopics = new Set<string>();
  private readonly stateSignal = signal<ConnectionState>('DISCONNECTED');
  private reconnectAttempt = 0;

  readonly state = this.stateSignal.asReadonly();

  constructor(private readonly tokenService: TokenService) {}

  connect(): void {
    if (this.client?.active) {
      return;
    }
    const token = this.tokenService.getAccessToken();
    if (!token) {
      return;
    }

    this.stateSignal.set('CONNECTING');

    this.client = new Client({
      brokerURL: `${environment.wsUrl}?token=${token}`,
      reconnectDelay: 1000,
      onConnect: () => {
        this.reconnectAttempt = 0;
        this.stateSignal.set('CONNECTED');
        this.resubscribeAll();
      },
      onWebSocketClose: () => {
        if (this.stateSignal() === 'CONNECTED') {
          this.stateSignal.set('RECONNECTING');
        }
        if (this.client) {
          this.client.reconnectDelay = this.backoffDelay();
        }
      },
      onStompError: () => this.stateSignal.set('ERROR')
    });

    this.client.activate();
  }

  disconnect(): void {
    this.desiredTopics.clear();
    this.subscriptions.clear();
    void this.client?.deactivate();
    this.client = null;
    this.stateSignal.set('DISCONNECTED');
  }

  subscribeToTopic(destination: string): void {
    this.desiredTopics.add(destination);
    this.trySubscribe(destination);
  }

  unsubscribeFromTopic(destination: string): void {
    this.desiredTopics.delete(destination);
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
    }
  }

  subscribeToWorkspace(workspaceId: string): void {
    this.subscribeToTopic(`/topic/workspaces/${workspaceId}`);
  }

  subscribeToProject(projectId: string): void {
    this.subscribeToTopic(`/topic/projects/${projectId}`);
  }

  subscribeToTask(taskId: string): void {
    this.subscribeToTopic(`/topic/tasks/${taskId}`);
  }

  subscribeToChannel(channelId: string): void {
    this.subscribeToTopic(`/topic/channels/${channelId}`);
  }

  subscribeToNotifications(): void {
    this.subscribeToTopic('/user/queue/notifications');
  }

  sendTyping(channelId: string, typing: boolean): void {
    this.send(`/app/channels/${channelId}/typing`, { typing });
  }

  send(destination: string, body: unknown): void {
    this.client?.publish({ destination, body: JSON.stringify(body) });
  }

  events(): Observable<RealtimeEvent> {
    return this.eventsSubject.asObservable();
  }

  eventsOfType(type: string): Observable<RealtimeEvent> {
    return this.eventsSubject.asObservable().pipe(filter((event) => event.type === type));
  }

  private trySubscribe(destination: string): void {
    if (!this.client?.connected) {
      return;
    }
    if (this.subscriptions.has(destination)) {
      return;
    }
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      this.handleMessage(message);
    });
    this.subscriptions.set(destination, subscription);
  }

  private resubscribeAll(): void {
    for (const destination of Array.from(this.desiredTopics)) {
      this.trySubscribe(destination);
    }
  }

  private handleMessage(message: IMessage): void {
    try {
      const event = JSON.parse(message.body) as RealtimeEvent;
      this.eventsSubject.next(event);
    } catch {
      // ignore malformed frames
    }
  }

  private backoffDelay(): number {
    this.reconnectAttempt += 1;
    const base = Math.min(Math.pow(2, this.reconnectAttempt), 30) * 1000;
    return Math.min(base, 30000);
  }
}
