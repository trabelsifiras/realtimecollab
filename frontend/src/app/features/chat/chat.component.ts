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
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
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
