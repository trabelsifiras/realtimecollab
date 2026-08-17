import { Component, EventEmitter, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { NgIf } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { avatarColor, initials } from '../../shared/utils/avatar.util';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, MatButtonModule, MatMenuModule, MatBadgeModule, NgIf],
  template: `
    <header class="topbar">
      <div class="left">
        <button mat-icon-button class="menu-btn" (click)="menuToggle.emit()" aria-label="Toggle menu">
          <mat-icon>menu</mat-icon>
        </button>
        <div class="search">
          <mat-icon class="search-icon">search</mat-icon>
          <input type="text" placeholder="Search Collab…" />
          <span class="search-kbd">⌘K</span>
        </div>
      </div>

      <div class="right">
        <span class="connection-chip" [class]="connectionClass()" [title]="'Connection: ' + realtime.state()">
          <span class="dot"></span>{{ connectionLabel() }}
        </span>

        <button
          mat-icon-button
          class="icon-btn"
          [matBadge]="notification.unreadCount()"
          [matBadgeHidden]="notification.unreadCount() === 0"
          matBadgeColor="warn"
          (click)="openNotifications()"
          aria-label="Notifications"
        >
          <mat-icon>notifications_none</mat-icon>
        </button>

        <button class="profile-btn" [matMenuTriggerFor]="userMenu">
          <span class="avatar" [style.background]="avatarColor(displayName())">{{ initials(displayName()) }}</span>
          <span class="profile-name">{{ displayName() }}</span>
          <mat-icon class="chevron">expand_more</mat-icon>
        </button>

        <mat-menu #userMenu="matMenu" class="user-menu">
          <div class="menu-header">
            <span class="avatar" [style.background]="avatarColor(displayName())">{{ initials(displayName()) }}</span>
            <div>
              <div class="menu-name">{{ displayName() }}</div>
              <div class="menu-email">{{ email() }}</div>
            </div>
          </div>
          <button mat-menu-item (click)="openProfile()">
            <mat-icon>person</mat-icon><span>Profile</span>
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon>exit_to_app</mat-icon><span>Log out</span>
          </button>
        </mat-menu>
      </div>
    </header>
  `,
  styles: [
    `
      .topbar {
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        background: var(--surface);
        border-bottom: 1px solid var(--border);
        position: sticky;
        top: 0;
        z-index: 20;
      }

      .left,
      .right {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .menu-btn {
        display: none;
      }

      .search {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 0 12px;
        height: 40px;
        width: 340px;
        color: var(--text-faint);
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }

      .search:focus-within {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.15);
      }

      .search input {
        border: none;
        outline: none;
        background: transparent;
        flex: 1;
        font-family: inherit;
        font-size: 0.9rem;
        color: var(--text);
      }

      .search-kbd {
        font-size: 0.7rem;
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 5px;
        padding: 2px 6px;
        color: var(--text-faint);
      }

      .connection-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.78rem;
        font-weight: 500;
        padding: 5px 12px;
        border-radius: 20px;
        background: var(--surface-2);
        border: 1px solid var(--border);
        color: var(--text-muted);
        margin-right: 4px;
      }

      .connection-chip .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .connection-chip.online .dot {
        background: var(--accent);
        box-shadow: 0 0 0 3px rgba(0, 184, 124, 0.18);
      }

      .connection-chip.offline .dot {
        background: var(--danger);
      }

      .icon-btn {
        color: var(--text-muted);
      }

      .profile-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--border);
        background: var(--surface);
        border-radius: 10px;
        padding: 4px 10px 4px 6px;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s ease;
      }

      .profile-btn:hover {
        background: var(--surface-2);
      }

      .profile-name {
        font-weight: 600;
        font-size: 0.88rem;
        color: var(--text);
      }

      .chevron {
        font-size: 18px;
        color: var(--text-faint);
      }

      .menu-header {
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 6px;
      }

      .menu-name {
        font-weight: 600;
        color: var(--text);
      }

      .menu-email {
        font-size: 0.78rem;
        color: var(--text-faint);
      }

      @media (max-width: 900px) {
        .menu-btn {
          display: inline-flex;
        }
        .search {
          width: 200px;
        }
      }

      @media (max-width: 560px) {
        .search {
          display: none;
        }
        .profile-name {
          display: none;
        }
      }
    `
  ]
})
export class TopbarComponent {
  @Output() menuToggle = new EventEmitter<void>();

  readonly realtime = inject(RealtimeService);
  readonly notification = inject(NotificationService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly avatarColor = avatarColor;
  readonly initials = initials;

  connectionLabel(): string {
    return this.realtime.state() === 'CONNECTED' ? 'Live' : 'Connecting…';
  }

  connectionClass(): string {
    return this.realtime.state() === 'CONNECTED' ? 'online' : 'offline';
  }

  displayName(): string {
    const user = this.auth.currentUser();
    if (!user) return 'User';
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username;
  }

  email(): string {
    return this.auth.currentUser()?.email ?? '';
  }

  openNotifications(): void {
    void this.router.navigate(['/notifications']);
  }

  openProfile(): void {
    void this.router.navigate(['/profile']);
  }

  logout(): void {
    this.auth.logout().subscribe(() => {
      this.realtime.disconnect();
      void this.router.navigate(['/login']);
    });
  }
}
