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
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
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
