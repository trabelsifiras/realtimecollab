import { Component, inject, OnInit } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '../../core/services/notification.service';
import { Notification } from '../../core/models/notification.model';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [NgFor, NgIf, DatePipe, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container narrow">
      <div class="header">
        <h1>Notifications</h1>
        <button mat-button color="primary" (click)="markAllRead()">Mark all as read</button>
      </div>

      <div class="list">
        <div *ngFor="let n of notifications" class="notification" [class.unread]="!n.read" (click)="open(n)">
          <span class="icon" [style.background]="iconColor(n.type) + '22'" [style.color]="iconColor(n.type)">
            <mat-icon>{{ iconFor(n.type) }}</mat-icon>
          </span>
          <div class="body">
            <div class="title">{{ n.title ?? n.type }}</div>
            <div class="message">{{ n.message }}</div>
            <div class="time">{{ n.createdAt | date: 'medium' }}</div>
          </div>
          <span *ngIf="!n.read" class="unread-dot"></span>
        </div>
      </div>

      <div *ngIf="notifications.length === 0" class="empty-state">
        <mat-icon>notifications_off</mat-icon>
        <p>You're all caught up.</p>
      </div>
    </div>
  `,
  styles: [
    `
      .narrow {
        max-width: 720px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .header h1 {
        margin: 0;
      }
      .list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .notification {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 16px;
        cursor: pointer;
        transition: box-shadow 0.15s ease;
      }
      .notification:hover {
        box-shadow: var(--shadow-sm);
      }
      .notification.unread {
        border-left: 4px solid var(--primary);
      }
      .icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .body {
        flex: 1;
        min-width: 0;
      }
      .title {
        font-weight: 600;
      }
      .message {
        color: var(--text-muted);
        font-size: 0.88rem;
        margin-top: 2px;
      }
      .time {
        font-size: 0.75rem;
        color: var(--text-faint);
        margin-top: 6px;
      }
      .unread-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--primary);
        margin-top: 6px;
        flex-shrink: 0;
      }
      .empty-state mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        color: var(--text-faint);
      }
    `
  ]
})
export class NotificationsComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);

  notifications: Notification[] = [];

  ngOnInit(): void {
    this.notificationService.list(0, 50).subscribe((page) => (this.notifications = page.content));
  }

  open(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markRead(notification.id).subscribe(() => {
        notification.read = true;
        this.notificationService.setUnreadCount(Math.max(0, this.notificationService.unreadCount() - 1));
      });
    }
  }

  markAllRead(): void {
    this.notificationService.markAllRead().subscribe(() => {
      this.notifications.forEach((n) => (n.read = true));
      this.notificationService.setUnreadCount(0);
    });
  }

  iconFor(type: string): string {
    switch (type) {
      case 'TASK_ASSIGNED':
        return 'assignment_ind';
      case 'MENTION':
        return 'alternate_email';
      case 'CHANNEL_MESSAGE':
        return 'chat';
      case 'COMMENT_ADDED':
        return 'comment';
      default:
        return 'notifications';
    }
  }

  iconColor(type: string): string {
    switch (type) {
      case 'TASK_ASSIGNED':
        return '#6c5ce7';
      case 'MENTION':
        return '#e01e5a';
      case 'CHANNEL_MESSAGE':
        return '#36c5f0';
      case 'COMMENT_ADDED':
        return '#00b87c';
      default:
        return '#9b9b9b';
    }
  }
}
