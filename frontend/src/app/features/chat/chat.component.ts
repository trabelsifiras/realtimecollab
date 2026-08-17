import { Component, Input, inject, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { ChannelService } from '../../core/services/channel.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { AuthService } from '../../core/services/auth.service';
import { Channel } from '../../core/models/channel.model';
import { Message } from '../../core/models/message.model';
import { User } from '../../core/models/user.model';
import { REALTIME_EVENT_TYPES } from '../../core/models/realtime.model';
import { avatarColor, initials } from '../../shared/utils/avatar.util';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, NgFor, NgIf, MatButtonModule, MatIconModule],
  template: `
    <div class="chat-page">
      <div class="chat-header">
        <button mat-icon-button routerLink="/workspaces/{{ channel?.workspaceId }}/channels" class="back-btn">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="channel-info">
          <div class="channel-name"># {{ channel?.name ?? '…' }}</div>
          <div class="channel-sub">
            <span class="status-dot online"></span>
            {{ onlineCount() }} online · {{ typingUsers.length ? typingLabel() : 'Everyone is here' }}
          </div>
        </div>
        <span class="spacer"></span>
        <button mat-icon-button class="header-btn"><mat-icon>info</mat-icon></button>
      </div>

      <div class="messages" #scrollContainer>
        <div *ngFor="let m of messages" class="message" [class.mine]="m.senderId === myId()">
          <span *ngIf="m.senderId !== myId()" class="msg-avatar" [style.background]="avatarColor(m.senderId)">
            {{ initials(senderName(m.senderId)) }}
          </span>
          <div class="msg-body">
            <div *ngIf="m.senderId !== myId()" class="sender-name">{{ senderName(m.senderId) }}</div>
            <div class="bubble">
              <div class="content">{{ m.content }}</div>
            </div>
            <div class="msg-meta">{{ m.createdAt | date: 'shortTime' }}</div>
          </div>
        </div>
        <div *ngIf="messages.length === 0" class="empty-state">
          <div class="empty-emoji">👋</div>
          <div>This is the beginning of <strong>#{{ channel?.name }}</strong></div>
          <div class="text-muted">Say hello to your team.</div>
        </div>
      </div>

      <div class="typing-row" *ngIf="typingUsers.length">
        <span class="typing-dots"><span></span><span></span><span></span></span>
        {{ typingLabel() }}
      </div>

      <div class="composer-wrap">
        <div class="composer">
          <textarea
            [(ngModel)]="draft"
            rows="1"
            placeholder="Message #{{ channel?.name }}"
            (ngModelChange)="onTyping()"
            (keydown)="submit($event)"
          ></textarea>
          <button class="send-btn" [class.disabled]="!draft.trim()" (click)="send()" [disabled]="!draft.trim()">
            <mat-icon>send</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .chat-page {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 60px);
        background: var(--surface);
      }

      .chat-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        border-bottom: 1px solid var(--border);
        background: var(--surface);
      }

      .back-btn {
        color: var(--text-muted);
      }

      .channel-info {
        flex: 1;
        min-width: 0;
      }

      .channel-name {
        font-weight: 700;
        font-size: 1rem;
      }

      .channel-sub {
        font-size: 0.75rem;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
      }

      .header-btn {
        color: var(--text-muted);
      }

      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 24px 20px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .message {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 3px 0;
        max-width: 85%;
      }

      .message.mine {
        align-self: flex-end;
        flex-direction: row-reverse;
      }

      .msg-avatar {
        width: 36px;
        height: 36px;
        border-radius: 9px;
        color: #fff;
        font-weight: 700;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        text-transform: uppercase;
      }

      .msg-body {
        display: flex;
        flex-direction: column;
      }

      .sender-name {
        font-size: 0.72rem;
        font-weight: 600;
        color: var(--text-muted);
        margin: 0 0 2px 4px;
      }

      .message.mine .msg-body {
        align-items: flex-end;
      }

      .bubble {
        padding: 9px 14px;
        border-radius: 12px;
        background: #f1f2f4;
        font-size: 0.92rem;
        line-height: 1.45;
        color: var(--text);
      }

      .message.mine .bubble {
        background: var(--primary);
        color: #fff;
        border-bottom-right-radius: 4px;
      }

      .message:not(.mine) .bubble {
        border-bottom-left-radius: 4px;
      }

      .msg-meta {
        font-size: 0.68rem;
        color: var(--text-faint);
        margin-top: 3px;
        padding: 0 4px;
      }

      .empty-state {
        text-align: center;
        color: var(--text-muted);
        padding: 80px 0;
      }

      .empty-emoji {
        font-size: 2.4rem;
        margin-bottom: 12px;
      }

      .typing-row {
        padding: 0 20px 6px;
        font-size: 0.82rem;
        color: var(--text-muted);
        font-style: italic;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .typing-dots {
        display: inline-flex;
        gap: 3px;
      }

      .typing-dots span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--text-faint);
        animation: blink 1.2s infinite;
      }

      .typing-dots span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .typing-dots span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes blink {
        0%, 80%, 100% { opacity: 0.3; }
        40% { opacity: 1; }
      }

      .composer-wrap {
        padding: 12px 20px 16px;
      }

      .composer {
        display: flex;
        align-items: flex-end;
        gap: 10px;
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 8px 8px 8px 16px;
        background: var(--surface);
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }

      .composer:focus-within {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.14);
      }

      .composer textarea {
        flex: 1;
        border: none;
        outline: none;
        resize: none;
        font-family: inherit;
        font-size: 0.92rem;
        line-height: 1.5;
        max-height: 140px;
        background: transparent;
        color: var(--text);
      }

      .send-btn {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        border: none;
        background: var(--primary);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: background 0.15s ease, transform 0.1s ease;
      }

      .send-btn:hover {
        background: var(--primary-dark);
      }

      .send-btn:active {
        transform: scale(0.94);
      }

      .send-btn.disabled {
        background: #d4d7dc;
        cursor: default;
      }
    `
  ]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() channelId!: string;
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  private readonly channelService = inject(ChannelService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly realtime = inject(RealtimeService);
  private readonly auth = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  readonly avatarColor = avatarColor;
  readonly initials = initials;

  channel: Channel | null = null;
  messages: Message[] = [];
  draft = '';
  typingUsers: string[] = [];
  private readonly userMap = new Map<string, User>();
  private readonly onlineUsers = new Set<string>();
  private typingTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.channelService.get(this.channelId).subscribe((channel) => {
      this.channel = channel;
      this.realtime.subscribeToChannel(this.channelId);
      this.realtime.subscribeToWorkspace(channel.workspaceId);
      this.workspaceService.listMembers(channel.workspaceId).subscribe((members) => {
        for (const member of members) {
          if (member.user) {
            this.userMap.set(member.userId, member.user);
          }
        }
      });
    });

    this.loadMessages();

    this.realtime
      .events()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (event.resourceId === this.channelId && event.type === REALTIME_EVENT_TYPES.MESSAGE_CREATED && event.actorId !== this.myId()) {
          this.loadMessages();
        }
        if (event.resourceId === this.channelId && event.type === REALTIME_EVENT_TYPES.TYPING_STARTED && event.actorId !== this.myId()) {
          this.setTyping(event.actorId ?? '', true);
        }
        if (event.resourceId === this.channelId && event.type === REALTIME_EVENT_TYPES.TYPING_STOPPED) {
          this.setTyping(event.actorId ?? '', false);
        }
        if (event.workspaceId === this.channel?.workspaceId && event.type === REALTIME_EVENT_TYPES.USER_ONLINE) {
          this.onlineUsers.add(event.actorId ?? '');
        }
        if (event.workspaceId === this.channel?.workspaceId && event.type === REALTIME_EVENT_TYPES.USER_OFFLINE) {
          this.onlineUsers.delete(event.actorId ?? '');
        }
      });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  myId(): string {
    return this.auth.currentUser()?.id ?? '';
  }

  onlineCount(): number {
    return this.onlineUsers.size + 1;
  }

  typingLabel(): string {
    const names = this.typingUsers.map((id) => this.senderName(id));
    return `${names.join(', ')} ${names.length === 1 ? 'is' : 'are'} typing…`;
  }

  senderName(userId: string): string {
    const user = this.userMap.get(userId);
    if (!user) return 'Team member';
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username;
  }

  loadMessages(): void {
    this.channelService.listMessages(this.channelId).subscribe((messages) => {
      this.messages = messages.slice().reverse();
    });
  }

  send(): void {
    const content = this.draft.trim();
    if (!content) return;
    this.channelService.sendMessage(this.channelId, content).subscribe({
      next: (message) => {
        this.draft = '';
        if (!this.messages.some((m) => m.id === message.id)) {
          this.messages.push(message);
        }
        this.realtime.sendTyping(this.channelId, false);
      },
      error: () => this.loadMessages()
    });
  }

  submit(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.send();
    }
  }

  onTyping(): void {
    if (this.draft.trim()) {
      this.realtime.sendTyping(this.channelId, true);
    }
    if (this.typingTimer) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => {
      this.realtime.sendTyping(this.channelId, false);
    }, 2000);
  }

  private setTyping(userId: string, typing: boolean): void {
    if (typing && !this.typingUsers.includes(userId)) {
      this.typingUsers.push(userId);
      setTimeout(() => {
        this.typingUsers = this.typingUsers.filter((u) => u !== userId);
      }, 4000);
    } else if (!typing) {
      this.typingUsers = this.typingUsers.filter((u) => u !== userId);
    }
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }
}
